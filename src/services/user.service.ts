import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AppError } from '../utils/app-error';
import User from '../models/user.model';

export class UserService {
  /**
   * Register a new user
   */
  static async registerUser(data: any) {
    const { name, email, password } = data;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError('Email address already registered', 409);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Save user
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    // Generate JWT Token
    const token = this.generateToken(newUser._id.toString(), newUser.email);

    // Omit password in response
    const userObj = newUser.toObject();
    delete userObj.password;

    return {
      user: userObj,
      token,
    };
  }

  /**
   * Authenticate / Login user
   */
  static async loginUser(data: any) {
    const { email, password } = data;

    // Find user and explicitly select password (since it's select: false in schema)
    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.password) {
      throw new AppError('Invalid email or password', 401);
    }

    // Check password
    const isPasswordMatch = await bcrypt.compare(password, user.password);
    if (!isPasswordMatch) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate JWT Token
    const token = this.generateToken(user._id.toString(), user.email);

    // Omit password in response
    const userObj = user.toObject();
    delete userObj.password;

    return {
      user: userObj,
      token,
    };
  }

  /**
   * Find user by ID (for profile routes)
   */
  static async findUserById(id: string) {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  /**
   * Helper to sign JWT tokens
   */
  private static generateToken(id: string, email: string): string {
    return jwt.sign(
      { id, email },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn } as jwt.SignOptions
    );
  }
}
