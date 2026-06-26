import bcrypt from 'bcryptjs';
import { query, queryOne, run } from '../config/db.js';
import { generateToken } from '../middleware/authMiddleware.js';

// Helper to validate password strength
function validatePasswordStrength(password) {
  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter (A-Z).';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter (a-z).';
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must contain at least one number (0-9).';
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return 'Password must contain at least one special character (e.g. !, @, #, $, %, etc.).';
  }
  return null;
}

export async function login(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let isValid = false;
    try {
      isValid = bcrypt.compareSync(password, user.password_hash);
    } catch (bcryptErr) {
      console.warn('Bcrypt verification failed:', bcryptErr.message);
    }

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      name: user.name || user.full_name
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        name: user.name || user.full_name
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function register(req, res, next) {
  const { fullName, email, username, password, role } = req.body;

  if (!fullName || !email || !username || !password) {
    return res.status(400).json({ error: 'Full name, email, username, and password are required.' });
  }

  // Validate password strength
  const strengthError = validatePasswordStrength(password);
  if (strengthError) {
    return res.status(400).json({ error: strengthError });
  }

  try {
    // Check if email already in use
    const emailCheck = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (emailCheck) {
      return res.status(400).json({ error: 'Email is already registered.' });
    }

    // Check if username already in use
    const usernameCheck = await queryOne('SELECT * FROM users WHERE username = ?', [username]);
    if (usernameCheck) {
      return res.status(400).json({ error: 'Username is already taken.' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const assignedRole = role === 'admin' ? 'admin' : 'user';

    // In db.js users table has "name" column for full name
    const result = await run(
      'INSERT INTO users (name, username, email, password, password_hash, role, reset_token, reset_token_expiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [fullName, username, email, null, passwordHash, assignedRole, null, null]
    );

    res.status(201).json({
      status: 'success',
      message: 'Account created successfully!',
      userId: result.id
    });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email address is required.' });
  }

  try {
    const user = await queryOne('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) {
      // For security, don't explicitly say "user not found" in enterprise setups,
      // but return code in responses for clear local development sandbox interaction.
      return res.status(404).json({ error: 'No account registered with this email address.' });
    }

    // Generate numeric 6-digit verification code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set expiry to 30 minutes from now (ISO String representation or Date object)
    const expiryDate = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    await run(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
      [resetCode, expiryDate, user.id]
    );

    res.json({
      status: 'success',
      message: 'A secure recovery code has been generated in the sandbox environment.',
      sandboxCode: resetCode,
      emailDeliveryStatus: 'Mocked (SMTP disabled)'
    });
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    return res.status(400).json({ error: 'Email, safety code, and new password are required.' });
  }

  const strengthError = validatePasswordStrength(newPassword);
  if (strengthError) {
    return res.status(400).json({ error: strengthError });
  }

  try {
    const user = await queryOne('SELECT * FROM users WHERE email = ? AND reset_token = ?', [email, token]);
    
    if (!user) {
      return res.status(400).json({ error: 'Invalid recovery code or email address.' });
    }

    // Verify code expiration
    if (user.reset_token_expiry) {
      const expiry = new Date(user.reset_token_expiry);
      if (expiry < new Date()) {
        return res.status(400).json({ error: 'Recovery code has expired. Please request a new one.' });
      }
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);

    // Update password & clear reset token
    await run(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [passwordHash, user.id]
    );

    res.json({
      status: 'success',
      message: 'Password reset successfully! You can now log in with your new credentials.'
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  const { oldPassword, newPassword } = req.body;
  
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized session.' });
  }

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'Old password and new password are required.' });
  }

  const strengthError = validatePasswordStrength(newPassword);
  if (strengthError) {
    return res.status(400).json({ error: strengthError });
  }

  try {
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    let isValid = false;
    try {
      isValid = bcrypt.compareSync(oldPassword, user.password_hash);
    } catch (err) {
      console.warn('Bcrypt verify failed:', err.message);
    }

    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10);
    await run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);

    res.json({
      status: 'success',
      message: 'Password changed successfully.'
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  const { username, email, name } = req.body;
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized session.' });
  }

  try {
    const user = await queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    if (username && username !== user.username) {
      const usernameCheck = await queryOne('SELECT * FROM users WHERE username = ? AND id != ?', [username, req.user.id]);
      if (usernameCheck) {
        return res.status(400).json({ error: 'Username is already taken.' });
      }
    }

    const updatedUsername = username || user.username;
    const updatedEmail = email || user.email;
    const updatedName = name || user.name || 'Administrator';

    await run('UPDATE users SET username = ?, email = ?, name = ? WHERE id = ?', [updatedUsername, updatedEmail, updatedName, user.id]);

    const token = generateToken({
      id: user.id,
      username: updatedUsername,
      email: updatedEmail,
      role: user.role,
      name: updatedName
    });

    res.json({
      status: 'success',
      message: 'Profile updated successfully.',
      token,
      user: {
        id: user.id,
        username: updatedUsername,
        email: updatedEmail,
        role: user.role,
        name: updatedName
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const user = await queryOne('SELECT id, name, username, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

export async function debugDb(req, res, next) {
  try {
    const testResult = await query('SHOW TABLES');
    res.json({ status: 'ok', tables: testResult, env: { 
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      hasPassword: !!process.env.DB_PASSWORD,
    }});
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message, stack: err.stack, env: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      hasPassword: !!process.env.DB_PASSWORD,
    }});
  }
}
