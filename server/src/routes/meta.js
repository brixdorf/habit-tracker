import { Router } from 'express';
import { todayIST, currentMonthIST } from '../dateUtils.js';

export const metaRouter = Router();

metaRouter.get('/today', (req, res) => {
  res.json({ today: todayIST(), month: currentMonthIST() });
});
