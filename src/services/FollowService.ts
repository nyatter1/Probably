import { accountService } from './AccountService.ts';
import { UserProfile } from '../types/account.ts';

type FollowChangeListener = (targetUserId: string) => void;

class FollowService {
  private listeners: Set<FollowChangeListener> = new Set();

  public subscribe(listener: FollowChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(targetUserId: string): void {
    this.listeners.forEach((l) => l(targetUserId));
  }

  public isFollowing(sourceUserId: string, targetUserId: string): boolean {
    if (!sourceUserId || !targetUserId || sourceUserId === targetUserId) return false;
    const source = accountService.getUserById(sourceUserId);
    if (!source) return false;
    return source.following.includes(targetUserId);
  }

  public follow(sourceUserId: string, targetUserId: string): { success: boolean; error?: string } {
    if (!sourceUserId || !targetUserId) {
      return { success: false, error: 'Invalid user IDs' };
    }
    if (sourceUserId === targetUserId) {
      return { success: false, error: 'Cannot follow yourself' };
    }

    const sourceAcc = accountService._getRawAccount(sourceUserId);
    const targetAcc = accountService._getRawAccount(targetUserId);

    if (!sourceAcc || !targetAcc) {
      return { success: false, error: 'User not found' };
    }

    // Check if already following
    if (!sourceAcc.following.includes(targetUserId)) {
      sourceAcc.following.push(targetUserId);
    }
    if (!targetAcc.followers.includes(sourceUserId)) {
      targetAcc.followers.push(sourceUserId);
    }

    accountService._saveRawAccounts();
    this.notify(targetUserId);
    this.notify(sourceUserId);

    return { success: true };
  }

  public unfollow(sourceUserId: string, targetUserId: string): { success: boolean; error?: string } {
    if (!sourceUserId || !targetUserId) {
      return { success: false, error: 'Invalid user IDs' };
    }

    const sourceAcc = accountService._getRawAccount(sourceUserId);
    const targetAcc = accountService._getRawAccount(targetUserId);

    if (!sourceAcc || !targetAcc) {
      return { success: false, error: 'User not found' };
    }

    sourceAcc.following = sourceAcc.following.filter((id) => id !== targetUserId);
    targetAcc.followers = targetAcc.followers.filter((id) => id !== sourceUserId);

    accountService._saveRawAccounts();
    this.notify(targetUserId);
    this.notify(sourceUserId);

    return { success: true };
  }

  public toggleFollow(sourceUserId: string, targetUserId: string): boolean {
    if (this.isFollowing(sourceUserId, targetUserId)) {
      this.unfollow(sourceUserId, targetUserId);
      return false;
    } else {
      this.follow(sourceUserId, targetUserId);
      return true;
    }
  }

  public getFollowers(userId: string): UserProfile[] {
    const user = accountService.getUserById(userId);
    if (!user) return [];
    return user.followers
      .map((id) => accountService.getUserById(id))
      .filter((u): u is UserProfile => u !== null);
  }

  public getFollowing(userId: string): UserProfile[] {
    const user = accountService.getUserById(userId);
    if (!user) return [];
    return user.following
      .map((id) => accountService.getUserById(id))
      .filter((u): u is UserProfile => u !== null);
  }

  public getCounts(userId: string): { followersCount: number; followingCount: number } {
    const user = accountService.getUserById(userId);
    if (!user) return { followersCount: 0, followingCount: 0 };
    return {
      followersCount: user.followers.length,
      followingCount: user.following.length,
    };
  }
}

export const followService = new FollowService();
