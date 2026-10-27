import { z } from 'zod';

const optionalUrl = z.union([z.url(), z.literal(''), z.null()]).transform((value) => value || null);
const optionalText = z.union([z.string().trim().max(2000), z.null(), z.undefined()]).transform((value) => value || null);

export const otpEmailSchema = z.object({ email: z.email('Введите корректный email') });
export const otpCodeSchema = z.string().regex(/^\d{6}$/, 'Код состоит из 6 цифр');
export const inviteCodeSchema = z.string().trim().toUpperCase().regex(/^[A-Z2-9]{6}$/, 'Код состоит из 6 символов');

export const wishlistInputSchema = z.object({
  title: z.string().trim().min(1, 'Добавьте название').max(120),
  description: optionalText,
  productUrl: optionalUrl,
  price: z.number().nonnegative().nullable(),
  currency: z.string().length(3).nullable(),
  priority: z.enum(['low', 'normal', 'high']).default('normal'),
});

export const eventInputSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: optionalText,
  allDay: z.boolean(),
  startsAt: z.iso.datetime().nullable(),
  endsAt: z.iso.datetime().nullable(),
  localStartDate: z.iso.date().nullable(),
  localEndDate: z.iso.date().nullable(),
  timezone: z.string().min(1),
}).superRefine((value, ctx) => {
  if (value.allDay && !value.localStartDate) ctx.addIssue({ code: 'custom', path: ['localStartDate'], message: 'Укажите дату' });
  if (!value.allDay && !value.startsAt) ctx.addIssue({ code: 'custom', path: ['startsAt'], message: 'Укажите время начала' });
  if (value.startsAt && value.endsAt && value.endsAt < value.startsAt) ctx.addIssue({ code: 'custom', path: ['endsAt'], message: 'Окончание должно быть позже начала' });
});

export function neutralNotificationBody(): string {
  return 'У вас обновление в «Мы вдвоём»';
}
