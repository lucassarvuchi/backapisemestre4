import { Router } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { protect, AuthRequest } from '../middleware/auth.js';
import { Visit } from '../models/Visit.js';
import { publicVisit, calculateVisitStatus, nextVisitId } from '../utils/visit.js';
import { saveFile, deleteFile } from '../utils/gridfs.js';

const router = Router();
const maxMb = Number(process.env.MAX_FILE_SIZE_MB ?? 15);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: maxMb * 1024 * 1024 } });

function isValidId(id: string) { return mongoose.isValidObjectId(id); }
function owner(req: AuthRequest) { return new mongoose.Types.ObjectId(req.user!.id); }

/**
 * @swagger
 * /api/visits:
 *   get:
 *     summary: Lista todas as visitas
 *     tags:
 *       - Visitas
 *     responses:
 *       200:
 *         description: Lista de visitas
 *       500:
 *         description: Erro interno do servidor
 */

router.get('/', protect, async (req: AuthRequest, res) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const filter: any = { engineerId: owner(req) };
    if (search) {
      const ors: any[] = [{ factoryName: { $regex: search, $options: 'i' } }];
      if (/^\d+$/.test(search)) ors.push({ visitId: Number(search) });
      filter.$or = ors;
    }
    const visits = await Visit.find(filter).sort({ createdAt: -1 });
    return res.json(visits.map(v => publicVisit(req, v)));
  } catch (e: any) { return res.status(500).json({ message: e.message }); }
});

/**
 * @swagger
 * /api/visits:
 *   post:
 *     summary: Cria uma nova visita
 *     tags:
 *       - Visitas
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - factoryName
 *             properties:
 *               factoryName:
 *                 type: string
 *                 example: Fábrica ABC
 *               factoryAddress:
 *                 type: string
 *                 example: Rua das Indústrias, 100 - São Paulo/SP
 *               factoryContact:
 *                 type: string
 *                 example: João - (11) 99999-9999
 *               locations:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Visita criada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token inválido ou não informado
 */

router.post('/', protect, async (req: AuthRequest, res) => {
  try {
    const factoryName = String(req.body?.factoryName ?? '').trim();
    if (!factoryName) return res.status(400).json({ message: 'Nome da fábrica é obrigatório.' });
    const visit = await Visit.create({
      visitId: await nextVisitId(),
      factoryName,
      factoryAddress: String(req.body?.factoryAddress ?? ''),
      factoryContact: String(req.body?.factoryContact ?? ''),
      engineerId: owner(req),
      status: 'agendada',
      locations: Array.isArray(req.body?.locations) ? req.body.locations : [],
    });
    return res.status(201).json(publicVisit(req, visit));
  } catch (e: any) { return res.status(400).json({ message: e.message }); }
});

/**
 * @swagger
 * /api/visits/{id}:
 *   get:
 *     summary: Busca uma visita pelo ID
 *     tags:
 *       - Visitas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID MongoDB da visita
 *         schema:
 *           type: string
 *           example: 66f123456789abcdef123456
 *     responses:
 *       200:
 *         description: Visita encontrada
 *       400:
 *         description: ID inválido
 *       401:
 *         description: Token inválido ou não informado
 *       404:
 *         description: Visita não encontrada
 *       500:
 *         description: Erro interno do servidor
 */

router.get('/:id', protect, async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'ID inválido.' });
    const visit = await Visit.findOne({ _id: req.params.id, engineerId: owner(req) });
    if (!visit) return res.status(404).json({ message: 'Visita não encontrada.' });
    return res.json(publicVisit(req, visit));
  } catch (e: any) { return res.status(500).json({ message: e.message }); }
});

/**
 * @swagger
 * /api/visits/{id}:
 *   put:
 *     summary: Atualiza uma visita
 *     tags:
 *       - Visitas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID MongoDB da visita
 *         schema:
 *           type: string
 *           example: 66f123456789abcdef123456
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               factoryName:
 *                 type: string
 *                 example: Fábrica ABC
 *               factoryAddress:
 *                 type: string
 *                 example: Rua das Indústrias, 100
 *               factoryContact:
 *                 type: string
 *                 example: João - (11) 99999-9999
 *               locations:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Visita atualizada com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Token inválido ou não informado
 *       404:
 *         description: Visita não encontrada
 */

router.put('/:id', protect, async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'ID inválido.' });
    const visit = await Visit.findOne({ _id: req.params.id, engineerId: owner(req) });
    if (!visit) return res.status(404).json({ message: 'Visita não encontrada.' });
    if (req.body.factoryName !== undefined) visit.factoryName = String(req.body.factoryName).trim();
    if (req.body.factoryAddress !== undefined) visit.factoryAddress = String(req.body.factoryAddress);
    if (req.body.factoryContact !== undefined) visit.factoryContact = String(req.body.factoryContact);
    if (Array.isArray(req.body.locations)) (visit as any).locations = req.body.locations;
    visit.status = calculateVisitStatus((visit as any).locations);
    await visit.save();
    return res.json(publicVisit(req, visit));
  } catch (e: any) { return res.status(400).json({ message: e.message }); }
});

/**
 * @swagger
 * /api/visits/{id}:
 *   delete:
 *     summary: Remove uma visita
 *     tags:
 *       - Visitas
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID MongoDB da visita
 *         schema:
 *           type: string
 *           example: 66f123456789abcdef123456
 *     responses:
 *       200:
 *         description: Visita removida com sucesso
 *       400:
 *         description: ID inválido
 *       401:
 *         description: Token inválido ou não informado
 *       404:
 *         description: Visita não encontrada
 *       500:
 *         description: Erro interno do servidor
 */

router.delete('/:id', protect, async (req: AuthRequest, res) => {
  try {
    if (!isValidId(req.params.id)) return res.status(400).json({ message: 'ID inválido.' });
    const visit = await Visit.findOneAndDelete({ _id: req.params.id, engineerId: owner(req) });
    if (!visit) return res.status(404).json({ message: 'Visita não encontrada.' });
    for (const location of (visit as any).locations ?? []) for (const doc of location.documents ?? []) {
      try { await deleteFile(doc.fileId); } catch {}
    }
    return res.json({ message: 'Visita removida.' });
  } catch (e: any) { return res.status(500).json({ message: e.message }); }
});

/**
 * @swagger
 * /api/visits/{id}/locations:
 *   post:
 *     summary: Adiciona um local à visita
 *     tags:
 *       - Locais
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID MongoDB da visita
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: Produção
 *     responses:
 *       201:
 *         description: Local criado com sucesso
 *       400:
 *         description: Nome do local não informado
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Visita não encontrada
 */

router.post('/:id/locations', protect, async (req: AuthRequest, res) => {
  try {
    const visit = await Visit.findOne({ _id: req.params.id, engineerId: owner(req) });
    if (!visit) return res.status(404).json({ message: 'Visita não encontrada.' });
    const name = String(req.body?.name ?? '').trim();
    if (!name) return res.status(400).json({ message: 'Nome do local é obrigatório.' });
    visit.locations.push({ name, status: 'pendente', answers: new Map(), documents: [] } as any);
    await visit.save();
    const location = visit.locations[visit.locations.length - 1];
    return res.status(201).json(publicVisit(req, visit).locations.find((x: any) => x._id === location._id.toString()));
  } catch (e: any) { return res.status(400).json({ message: e.message }); }
});

/**
 * @swagger
 * /api/visits/{id}/locations/{locId}:
 *   put:
 *     summary: Atualiza um local da visita
 *     tags:
 *       - Locais
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: locId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Produção
 *               status:
 *                 type: string
 *                 example: preenchido
 *               answers:
 *                 type: object
 *     responses:
 *       200:
 *         description: Local atualizado com sucesso
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Local ou visita não encontrada
 */

router.put('/:id/locations/:locId', protect, async (req: AuthRequest, res) => {
  try {
    const visit = await Visit.findOne({ _id: req.params.id, engineerId: owner(req) });
    if (!visit) return res.status(404).json({ message: 'Visita não encontrada.' });
    const loc: any = visit.locations.id(req.params.locId);
    if (!loc) return res.status(404).json({ message: 'Local não encontrado.' });
    if (req.body.name !== undefined) loc.name = String(req.body.name).trim();
    if (req.body.answers !== undefined) loc.answers = req.body.answers;
    if (req.body.status !== undefined) loc.status = req.body.status;
    await visit.save();
    visit.status = calculateVisitStatus(visit.locations);
    await visit.save();
    const publicLoc = publicVisit(req, visit).locations.find((x: any) => x._id === loc._id.toString());
    return res.json(publicLoc);
  } catch (e: any) { return res.status(400).json({ message: e.message }); }
});

/**
 * @swagger
 * /api/visits/{id}/locations/{locId}:
 *   delete:
 *     summary: Remove um local da visita
 *     tags:
 *       - Locais
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: locId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Local removido com sucesso
 *       401:
 *         description: Não autorizado
 *       404:
 *         description: Local ou visita não encontrada
 *       500:
 *         description: Erro interno do servidor
 */

router.delete('/:id/locations/:locId', protect, async (req: AuthRequest, res) => {
  try {
    const visit = await Visit.findOne({ _id: req.params.id, engineerId: owner(req) });
    if (!visit) return res.status(404).json({ message: 'Visita não encontrada.' });
    const loc: any = visit.locations.id(req.params.locId);
    if (!loc) return res.status(404).json({ message: 'Local não encontrado.' });
    for (const doc of loc.documents ?? []) { try { await deleteFile(doc.fileId); } catch {} }
    loc.deleteOne();
    visit.status = calculateVisitStatus(visit.locations);
    await visit.save();
    return res.json({ message: 'Local removido.' });
  } catch (e: any) { return res.status(500).json({ message: e.message }); }
});

/**
 * @swagger
 * /api/visits/{id}/locations/{locId}/documents:
 *   post:
 *     summary: Envia uma foto ou documento para um local
 *     tags:
 *       - Documentos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID MongoDB da visita
 *         schema:
 *           type: string
 *           example: 66f123456789abcdef123456
 *       - in: path
 *         name: locId
 *         required: true
 *         description: ID MongoDB do local
 *         schema:
 *           type: string
 *           example: 66f123456789abcdef123457
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Foto ou documento a ser enviado
 *               type:
 *                 type: string
 *                 enum:
 *                   - photo
 *                   - document
 *                 default: document
 *                 description: Tipo do arquivo
 *     responses:
 *       201:
 *         description: Arquivo enviado com sucesso
 *       400:
 *         description: Arquivo não enviado ou dados inválidos
 *       401:
 *         description: Token inválido ou não informado
 *       404:
 *         description: Visita ou local não encontrado
 */

router.post('/:id/locations/:locId/documents', protect, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    const visit = await Visit.findOne({ _id: req.params.id, engineerId: owner(req) });
    if (!visit) return res.status(404).json({ message: 'Visita não encontrada.' });
    const loc: any = visit.locations.id(req.params.locId);
    if (!loc) return res.status(404).json({ message: 'Local não encontrado.' });
    if (!req.file) return res.status(400).json({ message: 'Arquivo não enviado.' });
    const type = req.body?.type === 'photo' ? 'photo' : 'document';
    const fileId = await saveFile(req.file.buffer, req.file.originalname, req.file.mimetype, {
      visitId: visit._id.toString(), locationId: loc._id.toString(), engineerId: req.user!.id, type,
    });
    loc.documents.push({ name: req.file.originalname, type, mimeType: req.file.mimetype, size: req.file.size, fileId, createdAt: new Date() });
    await visit.save();
    const saved = publicVisit(req, visit).locations.find((x: any) => x._id === loc._id.toString());
    const doc = saved.documents[saved.documents.length - 1];
    return res.status(201).json(doc);
  } catch (e: any) { return res.status(400).json({ message: e.message }); }
});

/**
 * @swagger
 * /api/visits/{id}/locations/{locId}/documents/{docId}:
 *   delete:
 *     summary: Remove um documento ou foto de um local
 *     tags:
 *       - Documentos
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID MongoDB da visita
 *         schema:
 *           type: string
 *           example: 66f123456789abcdef123456
 *       - in: path
 *         name: locId
 *         required: true
 *         description: ID MongoDB do local
 *         schema:
 *           type: string
 *           example: 66f123456789abcdef123457
 *       - in: path
 *         name: docId
 *         required: true
 *         description: ID MongoDB do documento
 *         schema:
 *           type: string
 *           example: 66f123456789abcdef123458
 *     responses:
 *       200:
 *         description: Anexo removido com sucesso
 *       401:
 *         description: Token inválido ou não informado
 *       404:
 *         description: Visita, local ou anexo não encontrado
 *       500:
 *         description: Erro interno do servidor
 */

router.delete('/:id/locations/:locId/documents/:docId', protect, async (req: AuthRequest, res) => {
  try {
    const visit = await Visit.findOne({ _id: req.params.id, engineerId: owner(req) });
    if (!visit) return res.status(404).json({ message: 'Visita não encontrada.' });
    const loc: any = visit.locations.id(req.params.locId);
    const doc: any = loc?.documents.id(req.params.docId);
    if (!loc || !doc) return res.status(404).json({ message: 'Anexo não encontrado.' });
    try { await deleteFile(doc.fileId); } catch {}
    doc.deleteOne();
    await visit.save();
    return res.json({ message: 'Anexo removido.' });
  } catch (e: any) { return res.status(500).json({ message: e.message }); }
});

export default router;
