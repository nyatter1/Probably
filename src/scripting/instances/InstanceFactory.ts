import { RBXInstance } from './Instance.ts';
import { RBXPart } from './Part.ts';
import { RBXSpawnLocation } from './SpawnLocation.ts';
import { RBXFolder } from './Folder.ts';
import { RBXModel } from './Model.ts';
import { RBXHumanoid } from './Humanoid.ts';
import { RBXClickDetector } from './ClickDetector.ts';
import { RBXAccessory } from './Accessory.ts';
import { RBXTool } from './Tool.ts';
import { RBXScript, RBXLocalScript } from './Script.ts';
import { RBXBindableEvent, RBXBindableFunction, RBXRemoteEvent } from './BindableEvent.ts';
import { RBXAttachment } from './Attachment.ts';
import { RBXWeld, RBXWeldConstraint } from './Weld.ts';

// UI Instances
import { RBXScreenGui } from './ui/ScreenGui.ts';
import { RBXFrame } from './ui/Frame.ts';
import { RBXTextLabel } from './ui/TextLabel.ts';
import { RBXTextButton } from './ui/TextButton.ts';
import { RBXImageLabel, RBXImageButton } from './ui/ImageLabel.ts';
import { RBXTextBox } from './ui/TextBox.ts';
import { RBXScrollingFrame } from './ui/ScrollingFrame.ts';
import {
  RBXUICorner,
  RBXUIStroke,
  RBXUIPadding,
  RBXUIListLayout,
  RBXUIGridLayout,
  RBXUIScale,
  RBXUIAspectRatioConstraint,
} from './ui/UIComponents.ts';

export const RBXInstanceFactory = {
  new(className: string, parent?: RBXInstance): RBXInstance {
    let inst: RBXInstance;
    const lower = (className || '').toLowerCase().replace(/[\s_-]/g, '');

    switch (lower) {
      case 'part':
      case 'basepart':
        inst = new RBXPart();
        break;
      case 'spawnlocation':
        inst = new RBXSpawnLocation();
        break;
      case 'folder':
        inst = new RBXFolder();
        break;
      case 'model':
        inst = new RBXModel();
        break;
      case 'humanoid':
        inst = new RBXHumanoid();
        break;
      case 'clickdetector':
        inst = new RBXClickDetector();
        break;
      case 'attachment':
        inst = new RBXAttachment();
        break;
      case 'weld':
        inst = new RBXWeld();
        break;
      case 'weldconstraint':
        inst = new RBXWeldConstraint();
        break;
      case 'accessory':
      case 'hat':
        inst = new RBXAccessory();
        break;
      case 'tool':
        inst = new RBXTool();
        break;
      case 'script':
        inst = new RBXScript();
        break;
      case 'localscript':
        inst = new RBXLocalScript();
        break;
      case 'bindableevent':
        inst = new RBXBindableEvent();
        break;
      case 'bindablefunction':
        inst = new RBXBindableFunction();
        break;
      case 'remoteevent':
        inst = new RBXRemoteEvent();
        break;

      // GUI System
      case 'screengui':
        inst = new RBXScreenGui();
        break;
      case 'frame':
        inst = new RBXFrame();
        break;
      case 'textlabel':
        inst = new RBXTextLabel();
        break;
      case 'textbutton':
        inst = new RBXTextButton();
        break;
      case 'imagelabel':
        inst = new RBXImageLabel();
        break;
      case 'imagebutton':
        inst = new RBXImageButton();
        break;
      case 'textbox':
        inst = new RBXTextBox();
        break;
      case 'scrollingframe':
        inst = new RBXScrollingFrame();
        break;
      case 'uicorner':
        inst = new RBXUICorner();
        break;
      case 'uistroke':
        inst = new RBXUIStroke();
        break;
      case 'uipadding':
        inst = new RBXUIPadding();
        break;
      case 'uilistlayout':
        inst = new RBXUIListLayout();
        break;
      case 'uigridlayout':
        inst = new RBXUIGridLayout();
        break;
      case 'uiscale':
        inst = new RBXUIScale();
        break;
      case 'uiaspectratioconstraint':
        inst = new RBXUIAspectRatioConstraint();
        break;

      default:
        inst = new RBXInstance(className, className);
        break;
    }

    if (parent instanceof RBXInstance) {
      inst.Parent = parent;
    }

    return inst;
  },
};
