import { RBXInstance } from '../scripting/instances/Instance.ts';
import { RBXInstanceFactory } from '../scripting/instances/InstanceFactory.ts';
import { RBXVector3 } from '../scripting/datatypes/Vector3.ts';
import { RBXVector2 } from '../scripting/datatypes/Vector2.ts';
import { RBXColor3 } from '../scripting/datatypes/Color3.ts';
import { RBXCFrame } from '../scripting/datatypes/CFrame.ts';
import { RBXUDim } from '../scripting/datatypes/UDim.ts';
import { RBXUDim2 } from '../scripting/datatypes/UDim2.ts';
import { RBXScript, RBXLocalScript } from '../scripting/instances/Script.ts';

export interface SerializedInstance {
  id: string;
  className: string;
  name: string;
  properties: Record<string, any>;
  children?: SerializedInstance[];
}

export function serializeInstance(inst: RBXInstance): SerializedInstance {
  const props: Record<string, any> = {};

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
    'Text',
    'TextColor3',
    'TextSize',
    'Font',
    'TextScaled',
    'TextWrapped',
    'TextXAlignment',
    'TextYAlignment',
    'CornerRadius',
    'Thickness',
    'Color',
    'Transparency',
    'ApplyStrokeMode',
    'LineJoinMode',
    'Image',
    'ImageColor3',
    'ImageTransparency',
    'ScaleType',
    'PlaceholderText',
    'CanvasSize',
    'CanvasPosition',
    'Enabled',
    'Source',
    'MaxActivationDistance',
    'Scale',
    'AspectRatio',
  ];

  for (const k of propKeys) {
    if (k in inst) {
      const val = (inst as any)[k];
      if (val instanceof RBXVector3) {
        props[k] = { _type: 'Vector3', x: val.X, y: val.Y, z: val.Z };
      } else if (val instanceof RBXVector2) {
        props[k] = { _type: 'Vector2', x: val.X, y: val.Y };
      } else if (val instanceof RBXColor3) {
        props[k] = { _type: 'Color3', hex: val.toHex() };
      } else if (val instanceof RBXCFrame) {
        props[k] = { _type: 'CFrame', pos: [val.X, val.Y, val.Z] };
      } else if (val instanceof RBXUDim) {
        props[k] = { _type: 'UDim', scale: val.Scale, offset: val.Offset };
      } else if (val instanceof RBXUDim2) {
        props[k] = {
          _type: 'UDim2',
          xScale: val.X.Scale,
          xOffset: val.X.Offset,
          yScale: val.Y.Scale,
          yOffset: val.Y.Offset,
        };
      } else if (val && typeof val === 'object' && val.Name) {
        props[k] = val.Name;
      } else if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        props[k] = val;
      } else if (val && typeof val === 'object' && ('X' in val || 'x' in val) && ('Y' in val || 'y' in val)) {
        props[k] = { _type: 'Vector2', x: Number(val.X ?? val.x ?? 0), y: Number(val.Y ?? val.y ?? 0) };
      }
    }
  }

  // Handle Script code if present
  if (inst instanceof RBXScript || inst instanceof RBXLocalScript) {
    props['Source'] = inst.Source;
    props['Enabled'] = inst.Enabled;
  }

  const serialized: SerializedInstance = {
    id: inst.id,
    className: inst.ClassName,
    name: inst.Name,
    properties: props,
  };

  const children = inst.GetChildren();
  if (children.length > 0) {
    serialized.children = children.map(serializeInstance);
  }

  return serialized;
}

export function deserializeInstance(data: SerializedInstance, parent?: RBXInstance): RBXInstance {
  const inst = RBXInstanceFactory.new(data.className);
  inst.Name = data.name;
  (inst as any).id = data.id || inst.id;

  if (data.properties) {
    for (const [k, val] of Object.entries(data.properties)) {
      if (val && typeof val === 'object' && val._type) {
        if (val._type === 'Vector3') {
          (inst as any)[k] = new RBXVector3(val.x, val.y, val.z);
        } else if (val._type === 'Vector2') {
          (inst as any)[k] = new RBXVector2(val.x, val.y);
        } else if (val._type === 'Color3') {
          (inst as any)[k] = RBXColor3.fromHex(val.hex);
        } else if (val._type === 'CFrame') {
          (inst as any)[k] = RBXCFrame.new(val.pos?.[0] || 0, val.pos?.[1] || 0, val.pos?.[2] || 0);
        } else if (val._type === 'UDim') {
          (inst as any)[k] = new RBXUDim(val.scale, val.offset);
        } else if (val._type === 'UDim2') {
          (inst as any)[k] = new RBXUDim2(val.xScale, val.xOffset, val.yScale, val.yOffset);
        }
      } else {
        (inst as any)[k] = val;
      }
    }
  }

  // Ensure scripts have Source and Enabled correctly restored
  if (inst instanceof RBXScript) {
    if (data.properties?.Source !== undefined) {
      inst.Source = String(data.properties.Source);
    } else if (data.properties?.code !== undefined) {
      inst.Source = String(data.properties.code);
    }
    if (data.properties?.Enabled !== undefined) {
      inst.Enabled = Boolean(data.properties.Enabled);
    }
  }

  if (data.children && Array.isArray(data.children)) {
    for (const childData of data.children) {
      deserializeInstance(childData, inst);
    }
  }

  if (parent) {
    inst.Parent = parent;
  }

  return inst;
}
