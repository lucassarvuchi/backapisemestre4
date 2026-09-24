import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { AuthRequest, protect } from '../middleware/auth.js';

const router = Router();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function tokenFor(user: any): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET não configurado.');
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      name: user.name
    },
    secret,
    { expiresIn: '7d' }
  );
}

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Cadastra um novo usuário
 *     tags:
 *       - Autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 description: Nome do usuário
 *                 example: João da Silva
 *               email:
 *                 type: string
 *                 format: email
 *                 description: E-mail do usuário
 *                 example: joao@email.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Senha do usuário
 *                 example: 123456
 *     responses:
 *       201:
 *         description: Usuário cadastrado com sucesso
 *       400:
 *         description: Dados inválidos
 *       409:
 *         description: E-mail já cadastrado
 *       500:
 *         description: Erro interno do servidor
 */

router.post('/register', async (req, res) => {
    console.log('🔥 POST /register foi chamado');
  try {
    const name = String(req.body?.name ?? '').trim();
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    if (name.length < 2) {
      return res.status(400).json({
        message: 'Informe um nome válido.'
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Informe um e-mail válido.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: 'A senha deve ter pelo menos 6 caracteres.'
      });
    }

    if (await User.exists({ email })) {
      return res.status(409).json({
        message: 'E-mail já cadastrado.'
      });
    }

    const user = await User.create({
      name,
      email,
      password
    });

    return res.status(201).json({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      },
      token: tokenFor(user)
    });
  } catch (e: any) {
      console.error('❌ ERRO NO REGISTER:', e);

      return res.status(500).json({
        message: e.message || 'Erro interno do servidor.'
    });
  }
});


/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Realiza login do usuário
 *     tags:
 *       - Autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: E-mail do usuário
 *                 example: joao@email.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Senha do usuário
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *       401:
 *         description: Credenciais inválidas
 *       500:
 *         description: Erro interno do servidor
 */

router.post('/login', async (req, res) => {
  try {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');

    const user = await User.findOne({ email }).select('+password') as any;

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({
        message: 'Credenciais inválidas.'
      });
    }

    return res.json({
      token: tokenFor(user),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (e: any) {
    return res.status(500).json({
      message: e.message
    });
  }
});


/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Retorna os dados do usuário autenticado
 *     tags:
 *       - Autenticação
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário autenticado
 *       401:
 *         description: Token inválido ou não informado
 *       404:
 *         description: Usuário não encontrado
 */

router.get('/me', protect, async (req: AuthRequest, res: Response) => {
  const user = await User.findById(req.user!.id)
    .select('_id name email createdAt');

  if (!user) {
    return res.status(404).json({
      message: 'Usuário não encontrado.'
    });
  }

  return res.json(user);
});

export default router;