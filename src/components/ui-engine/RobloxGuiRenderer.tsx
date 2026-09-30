import React, { useEffect, useRef } from 'react';
import { RBXInstance } from '../../scripting/instances/Instance.ts';
import { RBXScreenGui } from '../../scripting/instances/ui/ScreenGui.ts';
import { RBXGuiObject } from '../../scripting/instances/ui/GuiObject.ts';
import { RBXTextLabel } from '../../scripting/instances/ui/TextLabel.ts';
import { RBXTextButton } from '../../scripting/instances/ui/TextButton.ts';
import { RBXImageLabel, RBXImageButton } from '../../scripting/instances/ui/ImageLabel.ts';
import { RBXTextBox } from '../../scripting/instances/ui/TextBox.ts';
import { RBXScrollingFrame } from '../../scripting/instances/ui/ScrollingFrame.ts';
import {
  RBXUICorner,
  RBXUIStroke,
  RBXUIPadding,
  RBXUIListLayout,
  RBXUIGridLayout,
  RBXUIScale,
  RBXUIAspectRatioConstraint,
} from '../../scripting/instances/ui/UIComponents.ts';
import { RBXVector2 } from '../../scripting/datatypes/Vector2.ts';

export interface RobloxGuiRendererProps {
  /** The container instance to search for ScreenGuis (e.g. player.PlayerGui, StarterGui, or an array) */
  root?: RBXInstance | RBXInstance[] | null;
  /** In editor mode, ID of currently selected instance for displaying selection outline */
  selectedInstanceId?: string | null;
  /** Callback when user clicks a UI object in the editor */
  onSelectInstance?: (instance: RBXInstance) => void;
  /** Whether we are in editor mode (enables selection highlight & interaction) */
  isEditor?: boolean;
  /** Revision counter to trigger reconciliation upon hierarchy or property updates */
  revision?: number;
}

// -------------------------------------------------------------
// SAFE DOM REMOVAL HELPER
// -------------------------------------------------------------
export function safeRemoveChild(child?: Node | null): void {
  if (child && child.parentNode) {
    child.parentNode.removeChild(child);
  }
}

// Convert Roblox Font Enum / string to CSS font-family + weight
export function getRobloxFontCSS(font: any): { fontFamily: string; fontWeight: string | number } {
  const fontName = typeof font === 'object' && font?.Name ? font.Name : String(font || 'SourceSans');

  switch (fontName) {
    case 'GothamBlack':
      return { fontFamily: 'Montserrat, Inter, system-ui, sans-serif', fontWeight: 900 };
    case 'GothamBold':
      return { fontFamily: 'Montserrat, Inter, system-ui, sans-serif', fontWeight: 800 };
    case 'GothamMedium':
      return { fontFamily: 'Montserrat, Inter, system-ui, sans-serif', fontWeight: 600 };
    case 'Gotham':
      return { fontFamily: 'Montserrat, Inter, system-ui, sans-serif', fontWeight: 500 };
    case 'SourceSansBold':
      return { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 700 };
    case 'SourceSansSemibold':
      return { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 600 };
    case 'SourceSansLight':
      return { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 300 };
    case 'SourceSansItalic':
      return { fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 400 };
    case 'FredokaOne':
    case 'Cartoon':
      return { fontFamily: '"Fredoka", "Nunito", "Comic Sans MS", cursive, sans-serif', fontWeight: 700 };
    case 'Arcade':
      return { fontFamily: '"Press Start 2P", monospace', fontWeight: 700 };
    case 'Code':
    case 'RobotoMono':
      return { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace', fontWeight: 600 };
    case 'Roboto':
      return { fontFamily: 'Roboto, system-ui, sans-serif', fontWeight: 500 };
    case 'Ubuntu':
      return { fontFamily: 'Ubuntu, system-ui, sans-serif', fontWeight: 600 };
    case 'SciFi':
      return { fontFamily: 'Impact, "Arial Black", sans-serif', fontWeight: 900 };
    case 'Antique':
      return { fontFamily: 'Georgia, Cambria, serif', fontWeight: 600 };
    case 'Arial':
      return { fontFamily: 'Arial, sans-serif', fontWeight: 400 };
    case 'ArialBold':
      return { fontFamily: 'Arial, sans-serif', fontWeight: 700 };
    default:
      return { fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', fontWeight: 500 };
  }
}

// -------------------------------------------------------------
// DETERMINISTIC DOM UI SYNCHRONIZATION ENGINE
// -------------------------------------------------------------
class GuiDomEngine {
  private container: HTMLElement;
  private isEditor: boolean;
  private selectedInstanceId: string | null = null;
  private onSelectInstance?: (instance: RBXInstance) => void;

  // Renderer-owned DOM elements: instance.id -> HTMLElement
  private elementMap = new Map<string, HTMLElement>();
  // Renderer-owned event signal cleanups per instance
  private signalCleanups = new Map<string, Array<() => void>>();
  // Track all managed ScreenGuis
  private managedScreenGuis = new Set<RBXScreenGui>();
  // Root ancestry subscription cleanups
  private rootCleanups: Array<() => void> = [];

  constructor(
    container: HTMLElement,
    isEditor = false,
    selectedInstanceId: string | null = null,
    onSelectInstance?: (instance: RBXInstance) => void
  ) {
    this.container = container;
    this.isEditor = isEditor;
    this.selectedInstanceId = selectedInstanceId;
    this.onSelectInstance = onSelectInstance;
  }

  public updateOptions(
    isEditor: boolean,
    selectedInstanceId: string | null = null,
    onSelectInstance?: (instance: RBXInstance) => void
  ) {
    this.isEditor = isEditor;
    this.selectedInstanceId = selectedInstanceId;
    this.onSelectInstance = onSelectInstance;

    // Refresh visual state across all managed instances
    this.managedScreenGuis.forEach((sg) => {
      this.updateScreenGuiDom(sg);
    });
    this.elementMap.forEach((_, id) => {
      // Re-apply styles on all GuiObjects to update editor outlines
      for (const sg of this.managedScreenGuis) {
        for (const desc of sg.GetDescendants()) {
          if (desc.id === id && desc instanceof RBXGuiObject) {
            this.updateGuiObjectStylesAndContent(desc);
          }
        }
      }
    });
  }

  public setRoot(root: RBXInstance | RBXInstance[] | null | undefined) {
    // Clear old root listeners
    this.rootCleanups.forEach((c) => c());
    this.rootCleanups = [];

    if (!root) {
      this.clearAll();
      return;
    }

    const roots = Array.isArray(root) ? root : [root];

    const scanAndReconcile = () => {
      const currentGuis: RBXScreenGui[] = [];
      const traverse = (node: RBXInstance) => {
        if (!node) return;
        if (node instanceof RBXScreenGui) {
          currentGuis.push(node);
          return;
        }
        for (const child of node.GetChildren()) {
          traverse(child);
        }
      };

      roots.forEach(traverse);

      // Unmount ScreenGuis no longer in root
      for (const oldSg of Array.from(this.managedScreenGuis)) {
        if (!currentGuis.includes(oldSg)) {
          this.unmountInstanceTree(oldSg);
          this.managedScreenGuis.delete(oldSg);
        }
      }

      // Mount/Update all current ScreenGuis
      currentGuis.forEach((sg) => {
        this.managedScreenGuis.add(sg);
        this.mountScreenGui(sg);
      });
    };

    // Initial scan
    scanAndReconcile();

    // Listen to hierarchy changes on roots
    roots.forEach((r) => {
      const c1 = r.ChildAdded.Connect(() => scanAndReconcile());
      const c2 = r.ChildRemoved.Connect(() => scanAndReconcile());
      const c3 = r.DescendantAdded.Connect(() => scanAndReconcile());
      const c4 = r.DescendantRemoving.Connect(() => scanAndReconcile());
      const c5 = r.AncestryChanged.Connect(() => scanAndReconcile());
      this.rootCleanups.push(() => {
        c1.Disconnect();
        c2.Disconnect();
        c3.Disconnect();
        c4.Disconnect();
        c5.Disconnect();
      });
    });
  }

  // -----------------------------------------------------------
  // SCREENGUI LIFECYCLE
  // -----------------------------------------------------------
  public mountScreenGui(sg: RBXScreenGui) {
    let layer = this.elementMap.get(sg.id);
    if (!layer || layer.parentNode !== this.container) {
      safeRemoveChild(layer);
      layer = document.createElement('div');
      layer.id = sg.id;
      layer.className = 'rbx-screengui-layer';
      layer.style.position = 'absolute';
      layer.style.inset = '0';
      layer.style.pointerEvents = 'none';
      this.elementMap.set(sg.id, layer);
      this.container.appendChild(layer);
    }

    this.updateScreenGuiDom(sg);
    this.hookScreenGui(sg);

    // Sync child GuiObjects
    this.reconcileChildren(sg, layer);
  }

  private updateScreenGuiDom(sg: RBXScreenGui) {
    const layer = this.elementMap.get(sg.id);
    if (!layer) return;

    layer.style.zIndex = String(sg.DisplayOrder || 1);
    layer.style.display = sg.Enabled || this.isEditor ? 'block' : 'none';
  }

  private hookScreenGui(sg: RBXScreenGui) {
    if (this.signalCleanups.has(sg.id)) return;
    const conns: Array<() => void> = [];

    const cProp = sg.GetPropertyChangedSignal('Enabled').Connect(() => {
      this.updateScreenGuiDom(sg);
    });
    conns.push(() => cProp.Disconnect());

    const cOrder = sg.GetPropertyChangedSignal('DisplayOrder').Connect(() => {
      this.updateScreenGuiDom(sg);
    });
    conns.push(() => cOrder.Disconnect());

    const cAdd = sg.ChildAdded.Connect((child) => {
      const layer = this.elementMap.get(sg.id);
      if (child instanceof RBXGuiObject && layer) {
        this.mountGuiObject(child, layer);
      }
    });
    conns.push(() => cAdd.Disconnect());

    const cRem = sg.ChildRemoved.Connect((child) => {
      if (child instanceof RBXGuiObject) {
        this.unmountInstanceTree(child);
      }
    });
    conns.push(() => cRem.Disconnect());

    this.signalCleanups.set(sg.id, conns);
  }

  // -----------------------------------------------------------
  // GUIOBJECT LIFECYCLE (Frame, TextLabel, TextButton, TextBox, ImageLabel, ScrollingFrame)
  // -----------------------------------------------------------
  public mountGuiObject(inst: RBXGuiObject, parentDom: HTMLElement) {
    let el = this.elementMap.get(inst.id);

    if (!el) {
      el = this.createDomElementForInstance(inst);
      this.elementMap.set(inst.id, el);
    }

    // Deterministic parentage
    if (el.parentNode !== parentDom) {
      safeRemoveChild(el);
      parentDom.appendChild(el);
    }

    // Apply styles and properties
    this.updateGuiObjectStylesAndContent(inst);

    // Hook properties and events
    this.hookGuiObject(inst);

    // Reconcile child GuiObjects
    this.reconcileChildren(inst, el);
  }

  private createDomElementForInstance(inst: RBXGuiObject): HTMLElement {
    const isTextBox = inst instanceof RBXTextBox;

    let el: HTMLElement;
    if (isTextBox) {
      el = document.createElement('input');
      el.setAttribute('type', 'text');
    } else {
      el = document.createElement('div');
    }

    el.id = inst.id;
    el.className = `rbx-gui-element rbx-gui-${inst.ClassName.toLowerCase()} select-none`;
    el.style.pointerEvents = 'auto';

    // Click & Pointer Events
    el.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      if (this.isEditor) {
        this.onSelectInstance?.(inst);
        return;
      }
      inst.MouseButton1Down.Fire(e.clientX, e.clientY);
      inst.InputBegan.Fire({ UserInputType: 'MouseButton1', Position: new RBXVector2(e.clientX, e.clientY) });
    });

    el.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      if (this.isEditor) return;
      inst.MouseButton1Up.Fire(e.clientX, e.clientY);
      inst.InputEnded.Fire({ UserInputType: 'MouseButton1', Position: new RBXVector2(e.clientX, e.clientY) });
    });

    el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.isEditor) {
        this.onSelectInstance?.(inst);
        return;
      }
      inst.MouseButton1Click.Fire();
    });

    el.addEventListener('mouseenter', (e) => {
      if (this.isEditor) {
        if (this.selectedInstanceId !== inst.id) {
          el.style.outline = '1px dashed rgba(96, 165, 250, 0.8)';
        }
        return;
      }
      inst.MouseEnter.Fire(e.clientX, e.clientY);
    });

    el.addEventListener('mouseleave', (e) => {
      if (this.isEditor) {
        if (this.selectedInstanceId !== inst.id) {
          el.style.outline = 'none';
        }
        return;
      }
      inst.MouseLeave.Fire(e.clientX, e.clientY);
    });

    // TextBox Specific Inputs
    if (isTextBox) {
      const inputEl = el as HTMLInputElement;
      inputEl.addEventListener('input', () => {
        (inst as RBXTextBox).Text = inputEl.value;
      });
      inputEl.addEventListener('focus', () => {
        if ((inst as RBXTextBox).ClearTextOnFocus) {
          (inst as RBXTextBox).Text = '';
          inputEl.value = '';
        }
        (inst as RBXTextBox).Focused.Fire();
      });
      inputEl.addEventListener('blur', () => {
        (inst as RBXTextBox).FocusLost.Fire(false);
      });
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          (inst as RBXTextBox).FocusLost.Fire(true);
          inputEl.blur();
        }
      });
    }

    return el;
  }

  public updateGuiObjectStylesAndContent(inst: RBXGuiObject) {
    const el = this.elementMap.get(inst.id);
    if (!el) return;

    const children = inst.GetChildren();
    const corner = children.find((c): c is RBXUICorner => c instanceof RBXUICorner);
    const stroke = children.find((c): c is RBXUIStroke => c instanceof RBXUIStroke);
    const padding = children.find((c): c is RBXUIPadding => c instanceof RBXUIPadding);
    const listLayout = children.find((c): c is RBXUIListLayout => c instanceof RBXUIListLayout);
    const scale = children.find((c): c is RBXUIScale => c instanceof RBXUIScale);

    const isSelected = this.isEditor && this.selectedInstanceId === inst.id;

    // 1. Position & Size (UDim2)
    const pos = inst.Position;
    const size = inst.Size;
    const anchor = inst.AnchorPoint;

    el.style.position = 'absolute';
    el.style.left = `calc(${pos.X.Scale * 100}% + ${pos.X.Offset}px)`;
    el.style.top = `calc(${pos.Y.Scale * 100}% + ${pos.Y.Offset}px)`;
    el.style.width = `calc(${size.X.Scale * 100}% + ${size.X.Offset}px)`;
    el.style.height = `calc(${size.Y.Scale * 100}% + ${size.Y.Offset}px)`;

    // 2. Transforms (AnchorPoint, Rotation, Scale)
    const transformParts: string[] = [];
    if (anchor.X !== 0 || anchor.Y !== 0) {
      transformParts.push(`translate(-${anchor.X * 100}%, -${anchor.Y * 100}%)`);
    }
    if (inst.Rotation !== 0) {
      transformParts.push(`rotate(${inst.Rotation}deg)`);
    }
    if (scale) {
      transformParts.push(`scale(${scale.Scale})`);
    }
    el.style.transform = transformParts.join(' ');
    el.style.transformOrigin = 'top left';

    // 3. Background Color & Transparency
    const bgHex = inst.BackgroundColor3 ? inst.BackgroundColor3.toHex() : '#ffffff';
    const bgAlpha = Math.max(0, Math.min(1, 1 - (inst.BackgroundTransparency ?? 0)));
    const r = parseInt(bgHex.slice(1, 3), 16) || 0;
    const g = parseInt(bgHex.slice(3, 5), 16) || 0;
    const b = parseInt(bgHex.slice(5, 7), 16) || 0;
    el.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${bgAlpha})`;

    // 4. Border Radius (UICorner)
    if (corner) {
      el.style.borderRadius = `calc(${corner.CornerRadius.Scale * 100}% + ${corner.CornerRadius.Offset}px)`;
    } else {
      el.style.borderRadius = '0px';
    }

    // 5. Stroke / Border (UIStroke)
    if (stroke && stroke.Thickness > 0) {
      const strokeHex = stroke.Color ? stroke.Color.toHex() : '#ffffff';
      const strokeAlpha = Math.max(0, Math.min(1, 1 - (stroke.Transparency ?? 0)));
      const sr = parseInt(strokeHex.slice(1, 3), 16) || 0;
      const sg = parseInt(strokeHex.slice(3, 5), 16) || 0;
      const sb = parseInt(strokeHex.slice(5, 7), 16) || 0;
      const strokeColor = `rgba(${sr}, ${sg}, ${sb}, ${strokeAlpha})`;

      if (stroke.ApplyStrokeMode === 'Border' || !stroke.ApplyStrokeMode) {
        el.style.border = `${stroke.Thickness}px solid ${strokeColor}`;
        el.style.outline = 'none';
      } else {
        el.style.border = 'none';
        el.style.outline = `${stroke.Thickness}px solid ${strokeColor}`;
      }
    } else if (inst.BorderSizePixel > 0) {
      const bColor = inst.BorderColor3 ? inst.BorderColor3.toHex() : '#000000';
      el.style.border = `${inst.BorderSizePixel}px solid ${bColor}`;
      el.style.outline = 'none';
    } else {
      el.style.border = 'none';
      el.style.outline = 'none';
    }

    // 6. Padding (UIPadding)
    if (padding) {
      const pt = `calc(${padding.PaddingTop.Scale * 100}% + ${padding.PaddingTop.Offset}px)`;
      const pr = `calc(${padding.PaddingRight.Scale * 100}% + ${padding.PaddingRight.Offset}px)`;
      const pb = `calc(${padding.PaddingBottom.Scale * 100}% + ${padding.PaddingBottom.Offset}px)`;
      const pl = `calc(${padding.PaddingLeft.Scale * 100}% + ${padding.PaddingLeft.Offset}px)`;
      el.style.padding = `${pt} ${pr} ${pb} ${pl}`;
    } else {
      el.style.padding = '0px';
    }

    // 7. Layouts (UIListLayout)
    if (listLayout) {
      el.style.display = 'flex';
      el.style.flexDirection = listLayout.FillDirection === 'Horizontal' ? 'row' : 'column';
      el.style.gap = `calc(${listLayout.Padding.Scale * 100}% + ${listLayout.Padding.Offset}px)`;
      if (listLayout.HorizontalAlignment === 'Center') el.style.alignItems = 'center';
      else if (listLayout.HorizontalAlignment === 'Right') el.style.alignItems = 'flex-end';
      else el.style.alignItems = 'stretch';

      if (listLayout.VerticalAlignment === 'Center') el.style.justifyContent = 'center';
      else if (listLayout.VerticalAlignment === 'Bottom') el.style.justifyContent = 'flex-end';
      else el.style.justifyContent = 'flex-start';
    } else {
      el.style.display = 'block';
    }

    // 8. General & Editor Outline
    el.style.zIndex = String(inst.ZIndex || 1);
    el.style.overflow = inst.ClipsDescendants ? 'hidden' : 'visible';
    el.style.boxSizing = 'border-box';
    el.style.display = inst.Visible || this.isEditor ? el.style.display : 'none';

    let tag = el.querySelector(':scope > .rbx-editor-selection-tag') as HTMLElement | null;
    if (isSelected && this.isEditor) {
      el.style.boxShadow = '0 0 0 2px #3b82f6, 0 0 0 4px rgba(59, 130, 246, 0.45)';
      el.style.outline = 'none';
      if (!tag) {
        tag = document.createElement('div');
        tag.className = 'rbx-editor-selection-tag pointer-events-none';
        tag.style.position = 'absolute';
        tag.style.backgroundColor = '#2563eb';
        tag.style.color = '#ffffff';
        tag.style.fontSize = '10px';
        tag.style.fontFamily = 'ui-monospace, monospace';
        tag.style.fontWeight = 'bold';
        tag.style.padding = '1px 6px';
        tag.style.borderRadius = '3px';
        tag.style.whiteSpace = 'nowrap';
        tag.style.zIndex = '9999';
        tag.style.pointerEvents = 'none';
        tag.style.boxShadow = '0 2px 4px rgba(0,0,0,0.5)';
        el.appendChild(tag);
      }
      const topOffset = (inst.Position?.Y?.Scale === 0 && (inst.Position?.Y?.Offset || 0) < 22) ? '2px' : '-22px';
      tag.style.top = topOffset;
      tag.style.left = '0';
      tag.textContent = `${inst.Name} [${inst.ClassName}]`;
      tag.style.display = 'block';
    } else {
      el.style.boxShadow = 'none';
      if (tag) {
        tag.style.display = 'none';
      }
    }

    const isButton = inst instanceof RBXTextButton || inst instanceof RBXImageButton;
    el.style.cursor = isButton || this.isEditor ? 'pointer' : 'default';
    el.style.pointerEvents = inst.Visible || this.isEditor ? 'auto' : 'none';

    // 9. Element Specific Content (Text / Image / Input)
    if (inst instanceof RBXTextBox) {
      const inputEl = el as HTMLInputElement;
      inputEl.value = inst.Text || '';
      inputEl.placeholder = inst.PlaceholderText || '';
      inputEl.disabled = this.isEditor;

      const fontStyles = getRobloxFontCSS(inst.Font);
      inputEl.style.fontFamily = fontStyles.fontFamily;
      inputEl.style.fontWeight = String(fontStyles.fontWeight);
      inputEl.style.fontSize = `${inst.TextSize || 16}px`;
      inputEl.style.color = inst.TextColor3 ? inst.TextColor3.toHex() : '#ffffff';
      inputEl.style.textAlign = (inst.TextXAlignment?.toLowerCase() || 'left') as any;
      inputEl.style.outline = 'none';
    } else if (inst instanceof RBXTextLabel || inst instanceof RBXTextButton) {
      let textNode = el.querySelector(':scope > .rbx-text-content') as HTMLElement | null;
      if (!textNode) {
        textNode = document.createElement('div');
        textNode.className = 'rbx-text-content pointer-events-none';
        textNode.style.width = '100%';
        textNode.style.height = '100%';
        el.prepend(textNode);
      }

      textNode.textContent = inst.Text || '';

      const fontStyles = getRobloxFontCSS(inst.Font);
      textNode.style.fontFamily = fontStyles.fontFamily;
      textNode.style.fontWeight = String(fontStyles.fontWeight);
      textNode.style.color = inst.TextColor3 ? inst.TextColor3.toHex() : '#ffffff';
      textNode.style.opacity = String(1 - (inst.TextTransparency ?? 0));

      if (inst.TextScaled) {
        textNode.style.fontSize = 'clamp(12px, 3.5vw, 42px)';
      } else {
        textNode.style.fontSize = `${inst.TextSize || 18}px`;
      }

      textNode.style.whiteSpace = inst.TextWrapped ? 'normal' : 'nowrap';
      textNode.style.wordBreak = inst.TextWrapped ? 'break-word' : 'normal';

      const xAlign = inst.TextXAlignment || 'Center';
      const yAlign = inst.TextYAlignment || 'Center';
      textNode.style.display = 'flex';
      textNode.style.alignItems =
        yAlign === 'Top' ? 'flex-start' : yAlign === 'Bottom' ? 'flex-end' : 'center';
      textNode.style.justifyContent =
        xAlign === 'Left' ? 'flex-start' : xAlign === 'Right' ? 'flex-end' : 'center';
      textNode.style.textAlign = xAlign.toLowerCase();
    } else if (inst instanceof RBXImageLabel || inst instanceof RBXImageButton) {
      let imgNode = el.querySelector(':scope > .rbx-image-content') as HTMLImageElement | null;
      if (inst.Image) {
        if (!imgNode) {
          imgNode = document.createElement('img');
          imgNode.className = 'rbx-image-content pointer-events-none rounded-[inherit]';
          imgNode.style.width = '100%';
          imgNode.style.height = '100%';
          imgNode.draggable = false;
          el.prepend(imgNode);
        }
        imgNode.src = inst.Image;
        imgNode.style.objectFit =
          inst.ScaleType === 'Fit' ? 'contain' : inst.ScaleType === 'Crop' ? 'cover' : 'fill';
        imgNode.style.opacity = String(1 - (inst.ImageTransparency ?? 0));
        imgNode.style.display = 'block';
      } else if (imgNode) {
        imgNode.style.display = 'none';
      }
    }
  }

  private hookGuiObject(inst: RBXGuiObject) {
    if (this.signalCleanups.has(inst.id)) return;
    const conns: Array<() => void> = [];

    // Instant reactivity to property changes
    const propKeys = [
      'Position',
      'Size',
      'AnchorPoint',
      'BackgroundColor3',
      'BackgroundTransparency',
      'BorderSizePixel',
      'BorderColor3',
      'Visible',
      'Rotation',
      'ZIndex',
      'LayoutOrder',
      'ClipsDescendants',
      'Active',
      'Text',
      'TextColor3',
      'TextSize',
      'Font',
      'TextScaled',
      'TextWrapped',
      'TextXAlignment',
      'TextYAlignment',
      'TextTransparency',
      'Image',
      'ImageColor3',
      'ImageTransparency',
      'ScaleType',
    ];

    propKeys.forEach((key) => {
      const sig = inst.GetPropertyChangedSignal(key);
      const conn = sig.Connect(() => {
        this.updateGuiObjectStylesAndContent(inst);
      });
      conns.push(() => conn.Disconnect());
    });

    // Parent change (reparenting)
    const cParent = inst.AncestryChanged.Connect((_, newParent) => {
      if (!newParent) {
        const el = this.elementMap.get(inst.id);
        safeRemoveChild(el);
      } else {
        const parentEl = this.elementMap.get(newParent.id);
        if (parentEl) {
          this.mountGuiObject(inst, parentEl);
        } else {
          const el = this.elementMap.get(inst.id);
          safeRemoveChild(el);
        }
      }
    });
    conns.push(() => cParent.Disconnect());

    // Child added (e.g. UICorner, UIStroke, child Frame/Button)
    const cAdd = inst.ChildAdded.Connect((child) => {
      const el = this.elementMap.get(inst.id);
      if (child instanceof RBXGuiObject && el) {
        this.mountGuiObject(child, el);
      } else {
        // Child modifier added: update styles
        this.updateGuiObjectStylesAndContent(inst);
        const sigCorner = child.GetPropertyChangedSignal('CornerRadius').Connect(() => {
          this.updateGuiObjectStylesAndContent(inst);
        });
        const sigColor = child.GetPropertyChangedSignal('Color').Connect(() => {
          this.updateGuiObjectStylesAndContent(inst);
        });
        const sigThick = child.GetPropertyChangedSignal('Thickness').Connect(() => {
          this.updateGuiObjectStylesAndContent(inst);
        });
        const sigTrans = child.GetPropertyChangedSignal('Transparency').Connect(() => {
          this.updateGuiObjectStylesAndContent(inst);
        });
        conns.push(() => {
          sigCorner.Disconnect();
          sigColor.Disconnect();
          sigThick.Disconnect();
          sigTrans.Disconnect();
        });
      }
    });
    conns.push(() => cAdd.Disconnect());

    const cRem = inst.ChildRemoved.Connect((child) => {
      if (child instanceof RBXGuiObject) {
        this.unmountInstanceTree(child);
      } else {
        this.updateGuiObjectStylesAndContent(inst);
      }
    });
    conns.push(() => cRem.Disconnect());

    // Destroy
    const cDestroy = inst.Destroying.Connect(() => {
      this.unmountInstanceTree(inst);
    });
    conns.push(() => cDestroy.Disconnect());

    this.signalCleanups.set(inst.id, conns);
  }

  private reconcileChildren(parentInst: RBXInstance, parentDom: HTMLElement) {
    const children = parentInst.GetChildren();

    // Hook modifier children property changes
    children.forEach((child) => {
      if (!(child instanceof RBXGuiObject)) {
        const sigCorner = child.GetPropertyChangedSignal('CornerRadius').Connect(() => {
          if (parentInst instanceof RBXGuiObject) this.updateGuiObjectStylesAndContent(parentInst);
        });
        const sigColor = child.GetPropertyChangedSignal('Color').Connect(() => {
          if (parentInst instanceof RBXGuiObject) this.updateGuiObjectStylesAndContent(parentInst);
        });
        const sigThick = child.GetPropertyChangedSignal('Thickness').Connect(() => {
          if (parentInst instanceof RBXGuiObject) this.updateGuiObjectStylesAndContent(parentInst);
        });
        const sigTrans = child.GetPropertyChangedSignal('Transparency').Connect(() => {
          if (parentInst instanceof RBXGuiObject) this.updateGuiObjectStylesAndContent(parentInst);
        });
        const cleanups = this.signalCleanups.get(child.id) || [];
        cleanups.push(() => {
          sigCorner.Disconnect();
          sigColor.Disconnect();
          sigThick.Disconnect();
          sigTrans.Disconnect();
        });
        this.signalCleanups.set(child.id, cleanups);
      }
    });

    // Mount all GuiObject children in proper order
    const expectedGuiKids = children.filter((c): c is RBXGuiObject => c instanceof RBXGuiObject);
    for (const child of expectedGuiKids) {
      this.mountGuiObject(child, parentDom);
    }

    // Reconcile DOM children: remove any element that is not an expected child
    const expectedIds = new Set(expectedGuiKids.map((c) => c.id));
    const domChildren = Array.from(parentDom.children).filter((el) => el.classList.contains('rbx-gui-element'));
    for (const domEl of domChildren) {
      if (!expectedIds.has(domEl.id)) {
        safeRemoveChild(domEl);
      }
    }
  }

  public unmountInstanceTree(inst: RBXInstance) {
    // Unmount children recursively
    inst.GetChildren().forEach((child) => {
      this.unmountInstanceTree(child);
    });

    // Remove DOM element safely
    const el = this.elementMap.get(inst.id);
    if (el) {
      safeRemoveChild(el);
      this.elementMap.delete(inst.id);
    }

    // Disconnect signal listeners
    const cleanups = this.signalCleanups.get(inst.id);
    if (cleanups) {
      cleanups.forEach((c) => c());
      this.signalCleanups.delete(inst.id);
    }
  }

  public clearAll() {
    this.rootCleanups.forEach((c) => c());
    this.rootCleanups = [];

    this.managedScreenGuis.forEach((sg) => {
      this.unmountInstanceTree(sg);
    });
    this.managedScreenGuis.clear();

    for (const [, el] of this.elementMap) {
      safeRemoveChild(el);
    }
    this.elementMap.clear();

    for (const [, cleanups] of this.signalCleanups) {
      cleanups.forEach((c) => c());
    }
    this.signalCleanups.clear();

    while (this.container.firstChild) {
      this.container.removeChild(this.container.firstChild);
    }
  }
}

// -------------------------------------------------------------
// REACT COMPONENT BRIDGE
// -------------------------------------------------------------
export default function RobloxGuiRenderer({
  root,
  selectedInstanceId,
  onSelectInstance,
  isEditor = false,
  revision = 0,
}: RobloxGuiRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GuiDomEngine | null>(null);

  // Initialize engine once on mount
  useEffect(() => {
    if (!containerRef.current) return;
    const engine = new GuiDomEngine(containerRef.current, isEditor, selectedInstanceId, onSelectInstance);
    engineRef.current = engine;
    engine.setRoot(root);

    return () => {
      engine.clearAll();
      engineRef.current = null;
    };
  }, []);

  // Update root when root reference or revision changes
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setRoot(root);
    }
  }, [root, revision]);

  // Update options (selection, isEditor, callbacks)
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateOptions(isEditor, selectedInstanceId, onSelectInstance);
    }
  }, [isEditor, selectedInstanceId, onSelectInstance]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none overflow-hidden select-none z-20"
    />
  );
}
