import express from 'express';
import { MemberHandler } from './members.handler';

const router = express.Router();

router.get('/', MemberHandler.getMembers);
router.get('/me', MemberHandler.getMyMember);
router.put('/:id', MemberHandler.updateMember);

export default router;
