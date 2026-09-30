export interface EnumItem {
  Name: string;
  Value: number;
  EnumType: string;
  toString: () => string;
}

function makeEnum(enumName: string, items: string[]): Record<string, EnumItem> & { GetEnumItems: () => EnumItem[] } {
  const result: any = {};
  const list: EnumItem[] = [];

  items.forEach((item, index) => {
    const enumItem: EnumItem = {
      Name: item,
      Value: index,
      EnumType: enumName,
      toString: () => `Enum.${enumName}.${item}`,
    };
    result[item] = enumItem;
    list.push(enumItem);
  });

  result.GetEnumItems = () => list;
  return result;
}

export const RBXEnum = {
  Material: makeEnum('Material', [
    'Plastic',
    'SmoothPlastic',
    'Neon',
    'Wood',
    'WoodPlanks',
    'Brick',
    'Cobblestone',
    'Concrete',
    'CorrodedMetal',
    'DiamondPlate',
    'Fabric',
    'Foil',
    'ForceField',
    'Glass',
    'Granite',
    'Grass',
    'Ice',
    'Marble',
    'Metal',
    'Pebble',
    'Rock',
    'Rust',
    'Sand',
    'Slate',
  ]),
  EasingStyle: makeEnum('EasingStyle', [
    'Linear',
    'Sine',
    'Quad',
    'Cubic',
    'Quart',
    'Quint',
    'Back',
    'Bounce',
    'Elastic',
    'Exponential',
    'Circular',
  ]),
  EasingDirection: makeEnum('EasingDirection', [
    'In',
    'Out',
    'InOut',
  ]),
  HumanoidStateType: makeEnum('HumanoidStateType', [
    'None',
    'Running',
    'Jumping',
    'Freefall',
    'Flying',
    'Landed',
    'Dead',
    'Physics',
    'Seated',
    'PlatformStanding',
  ]),
  PlaybackState: makeEnum('PlaybackState', [
    'Begin',
    'Delayed',
    'Playing',
    'Paused',
    'Completed',
    'Cancelled',
  ]),
  PartType: makeEnum('PartType', [
    'Block',
    'Ball',
    'Cylinder',
    'Wedge',
    'CornerWedge',
  ]),
  Font: makeEnum('Font', [
    'Legacy',
    'Arial',
    'ArialBold',
    'SourceSans',
    'SourceSansBold',
    'SourceSansItalic',
    'SourceSansLight',
    'SourceSansSemibold',
    'Gotham',
    'GothamBold',
    'GothamMedium',
    'GothamBlack',
    'FredokaOne',
    'Arcade',
    'SciFi',
    'Cartoon',
    'Highway',
    'Fondamento',
    'Antique',
    'Code',
    'Roboto',
    'RobotoMono',
    'Ubuntu',
    'Kalam',
  ]),
  TextXAlignment: makeEnum('TextXAlignment', [
    'Left',
    'Center',
    'Right',
  ]),
  TextYAlignment: makeEnum('TextYAlignment', [
    'Top',
    'Center',
    'Bottom',
  ]),
  ApplyStrokeMode: makeEnum('ApplyStrokeMode', [
    'Contextual',
    'Border',
  ]),
  LineJoinMode: makeEnum('LineJoinMode', [
    'Round',
    'Bevel',
    'Miter',
  ]),
  ZIndexBehavior: makeEnum('ZIndexBehavior', [
    'Global',
    'Sibling',
  ]),
  ScaleType: makeEnum('ScaleType', [
    'Stretch',
    'Slice',
    'Tile',
    'Fit',
    'Crop',
  ]),
  FillDirection: makeEnum('FillDirection', [
    'Horizontal',
    'Vertical',
  ]),
  HorizontalAlignment: makeEnum('HorizontalAlignment', [
    'Left',
    'Center',
    'Right',
  ]),
  VerticalAlignment: makeEnum('VerticalAlignment', [
    'Top',
    'Center',
    'Bottom',
  ]),
  SortOrder: makeEnum('SortOrder', [
    'Name',
    'Custom',
    'LayoutOrder',
  ]),
  SizeConstraint: makeEnum('SizeConstraint', [
    'RelativeXY',
    'RelativeXX',
    'RelativeYY',
  ]),
};
