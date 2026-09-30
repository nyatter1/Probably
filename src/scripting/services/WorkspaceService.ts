import { RBXModel } from '../instances/Model.ts';
import { RBXBasePart } from '../instances/BasePart.ts';
import { RBXInstance } from '../instances/Instance.ts';

export class RBXWorkspace extends RBXModel {
  Gravity = 196.2;
  FallenPartsDestroyHeight = -50;
  CurrentCamera: any = null;

  // Bridge hook to add/remove Three.js objects
  onPartAddedToWorkspace?: (part: RBXBasePart) => void;
  onPartRemovedFromWorkspace?: (part: RBXBasePart) => void;

  constructor() {
    super('Workspace');
    this.Name = 'Workspace';

    this.ChildAdded.Connect((child) => {
      this.handleDescendantAdded(child);
    });

    this.ChildRemoved.Connect((child) => {
      this.handleDescendantRemoved(child);
    });
  }

  override IsA(className: string): boolean {
    if (className === 'Workspace' || className === 'WorldModel') return true;
    return super.IsA(className);
  }

  handleDescendantAdded(inst: RBXInstance): void {
    if (inst.IsA('BasePart')) {
      if (this.onPartAddedToWorkspace) {
        this.onPartAddedToWorkspace(inst as RBXBasePart);
      }
    }
    // Also attach to child's ChildAdded recursively
    inst.ChildAdded.Connect((child) => {
      this.handleDescendantAdded(child);
    });
    inst.ChildRemoved.Connect((child) => {
      this.handleDescendantRemoved(child);
    });
    for (const child of inst.GetChildren()) {
      this.handleDescendantAdded(child);
    }
  }

  handleDescendantRemoved(inst: RBXInstance): void {
    if (inst.IsA('BasePart')) {
      if (this.onPartRemovedFromWorkspace) {
        this.onPartRemovedFromWorkspace(inst as RBXBasePart);
      }
    }
    for (const child of inst.GetChildren()) {
      this.handleDescendantRemoved(child);
    }
  }
}
