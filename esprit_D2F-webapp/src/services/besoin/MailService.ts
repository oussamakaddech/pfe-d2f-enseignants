import { defaultApi as axios } from "@/utils/helpers/httpClient";
import { config } from "@/config/env";
const MAIL_API_URL = `${config.FORMATION_URL}/formation/mail`;

const MailService = {
  async sendEmail(to: string, subject: string, content: string) {
    const response = await axios.post(
      `${MAIL_API_URL}/send`,
      { to, subject, content }
    );
    return response.data;
  }
};

export default MailService;
