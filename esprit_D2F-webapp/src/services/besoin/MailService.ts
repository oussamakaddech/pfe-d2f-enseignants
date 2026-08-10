import { defaultApi as axios } from '@/services/httpClient';
import { config } from '@/config/env';
const MAIL_API_URL = `${config.FORMATION_URL}/formation/mail`;

export interface SendEmailPayload {
  to: string;
  subject: string;
  content: string;
  isHtml?: boolean;
}

const MailService = {
  async sendEmail(to: string, subject: string, content: string, isHtml = false) {
    const payload: SendEmailPayload = { to, subject, content };
    if (isHtml) payload.isHtml = true;
    const response = await axios.post(`${MAIL_API_URL}/send`, payload);
    return response.data;
  },
};

export default MailService;
