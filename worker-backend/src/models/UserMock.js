// Mock User model for Cloudflare Workers
// Complete refactoring to MongoDB native driver will be done separately

import bcrypt from 'bcryptjs';

const USERS_COLLECTION = 'users';

export default class User {
  constructor(data) {
    this._id = data._id || null;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.role = data.role || 'student';
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  async save() {
    // Mock implementation - in production, save to MongoDB
    if (this.password && !this.password.startsWith('$2')) {
      this.password = await bcrypt.hash(this.password, 10);
    }
    this._id = Math.random().toString(36).substr(2, 9);
    return this;
  }

  static async findOne(query) {
    // Mock implementation
    return null;  // Pretend no user exists (for MVP testing)
  }

  static async findById(id) {
    // Mock implementation
    return null;
  }

  async comparePassword(password) {
    // Mock implementation
    return await bcrypt.compare(password, this.password);
  }

  toJSON() {
    const { password, ...user } = this;
    return user;
  }
}
