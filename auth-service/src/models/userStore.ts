import crypto from 'node:crypto';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

class UserStore {
  private usersById = new Map<string, UserRecord>();
  private userIdByEmail = new Map<string, string>();

   normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  findByEmail(email: string): UserRecord | undefined {
    const id = this.userIdByEmail.get(this.normalizeEmail(email));
    return id ? this.usersById.get(id) : undefined;
  }

  findById(id: string): UserRecord | undefined {
    return this.usersById.get(id);
  }

  create(input: { email: string; name: string; passwordHash: string }): UserRecord {
    const normalizedEmail = this.normalizeEmail(input.email);
    if (this.userIdByEmail.has(normalizedEmail)) {
      throw new Error('USER_ALREADY_EXISTS');
    }

    const record: UserRecord = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      name: input.name.trim(),
      passwordHash: input.passwordHash,
      createdAt: new Date().toISOString(),
    };

    this.usersById.set(record.id, record);
    this.userIdByEmail.set(normalizedEmail, record.id);
    return record;
  }

  toPublicUser(user: UserRecord): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }

  clear(): void {
    this.usersById.clear();
    this.userIdByEmail.clear();
  }
}

export const userStore = new UserStore();
