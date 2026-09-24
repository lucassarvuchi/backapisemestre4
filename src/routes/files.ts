import { Router } from 'express';
import { protect, AuthRequest } from '../middleware/auth.js';
import { streamOwnedFile } from '../utils/gridfs.js';

const router = Router();

/**
 * @swagger
 * /api/files/{fileId}:
 *   get:
 *     summary: Obtém um arquivo armazenado
 *     description: Retorna o conteúdo de uma foto ou documento armazenado no GridFS.
 *     tags:
 *       - Arquivos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         description: ID do arquivo armazenado no GridFS
 *         schema:
 *           type: string
 *           example: 66f123456789abcdef123456
 *     responses:
 *       200:
 *         description: Arquivo encontrado e enviado
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Token inválido ou não informado
 *       404:
 *         description: Arquivo não encontrado
 */

router.get('/:fileId', protect, async (req: AuthRequest, res) => {
  try {
    const found = await streamOwnedFile(req.params.fileId, req.user!.id, res);

    if (!found && !res.headersSent) {
      return res.status(404).json({
        message: 'Arquivo não encontrado.'
      });
    }
  } catch {
    if (!res.headersSent) {
      return res.status(404).json({
        message: 'Arquivo não encontrado.'
      });
    }
  }
});

export default router;