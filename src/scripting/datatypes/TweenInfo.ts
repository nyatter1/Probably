export class RBXTweenInfo {
  readonly Time: number;
  readonly EasingStyle: string;
  readonly EasingDirection: string;
  readonly RepeatCount: number;
  readonly Reverses: boolean;
  readonly DelayTime: number;

  constructor(
    time = 1,
    easingStyle: any = 'Sine',
    easingDirection: any = 'Out',
    repeatCount = 0,
    reverses = false,
    delayTime = 0
  ) {
    this.Time = Math.max(0, Number(time) || 0);
    this.EasingStyle = typeof easingStyle === 'string' ? easingStyle : (easingStyle?.Name || easingStyle?.name || 'Sine');
    this.EasingDirection = typeof easingDirection === 'string' ? easingDirection : (easingDirection?.Name || easingDirection?.name || 'Out');
    this.RepeatCount = Number(repeatCount) || 0;
    this.Reverses = Boolean(reverses);
    this.DelayTime = Math.max(0, Number(delayTime) || 0);
  }

  get time() { return this.Time; }
  get easingStyle() { return this.EasingStyle; }
  get easingDirection() { return this.EasingDirection; }
  get repeatCount() { return this.RepeatCount; }
  get reverses() { return this.Reverses; }
  get delayTime() { return this.DelayTime; }

  static new(
    time = 1,
    style?: any,
    dir?: any,
    repeats = 0,
    reverses = false,
    delay = 0
  ): RBXTweenInfo {
    return new RBXTweenInfo(time, style, dir, repeats, reverses, delay);
  }
}
