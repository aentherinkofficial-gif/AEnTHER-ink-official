# AetherInk Studio — Automated Contact Email Setup

The Contact form uses EmailJS so visitors can send commission enquiries to your inbox while the site is hosted as a static GitHub Pages website. No custom server is required.

## 1. Create an EmailJS account and connect your inbox

1. Open https://www.emailjs.com/ and create an account.
2. In **Email Services**, add/connect the inbox where AetherInk enquiries should arrive (for example, your Gmail inbox).
3. Send a test email from the EmailJS dashboard to verify that the connected service works.

## 2. Create the email template

Open **Email Templates** and create a template. Set it up as follows:

- **To Email:** the inbox where you want to receive enquiries.
- **From Name:** `{{from_name}}`
- **Reply To:** `{{reply_to}}`
- **Subject:** `New AetherInk enquiry — {{service}}`
- **Content:**

```text
New commission enquiry from AetherInk Studio

Name: {{from_name}}
Email: {{reply_to}}
Requested service: {{service}}

Project details:
{{message}}
```

Keep the **From Email** as the verified/default sender provided by your connected email service. Use Reply To to reply directly to the visitor.

## 3. Copy your IDs into the project

In your EmailJS dashboard, copy:

- Public Key: **Account > API Keys** (or Account page, depending on dashboard layout)
- Service ID: **Email Services**
- Template ID: **Email Templates**

Open `emailjs-config.js` and replace these three values:

```js
window.AETHERINK_EMAILJS_CONFIG = Object.freeze({
  publicKey: "YOUR_EMAILJS_PUBLIC_KEY",
  serviceId: "YOUR_EMAILJS_SERVICE_ID",
  templateId: "YOUR_EMAILJS_TEMPLATE_ID"
});
```

Do this in **both** copies if you use both:
- `LOCAL-PROJECT/emailjs-config.js` for local testing
- `GITHUB-PAGES-READY/emailjs-config.js` for the live website

The Public Key, Service ID and Template ID are browser-side identifiers. Never place your EmailJS **Private Key**, Gmail password, or any other secret in website JavaScript.

## 4. Restrict where the form can be used

In EmailJS dashboard, open **Domains** and allow only the origins you use, for example:

- `http://localhost:5500` (or the actual Live Server origin/port you use)
- `https://YOUR-GITHUB-USERNAME.github.io`
- `https://YOUR-CUSTOM-DOMAIN` (only if you connect one)

Use the exact scheme and hostname. EmailJS documents this as its domain allowlist. Consider enabling reCAPTCHA v2 in the EmailJS template if you receive spam.

## 5. Test before publishing

1. Open `LOCAL-PROJECT/index.html` through VS Code Live Server.
2. Fill the contact form with a test name, your own reply email, a service, and a message.
3. Submit. The form should show a success message only after EmailJS confirms it sent the email.
4. Check the receiving inbox and Spam/Junk folder.
5. Copy the same three EmailJS values into `GITHUB-PAGES-READY/emailjs-config.js` before uploading that folder's contents to GitHub Pages.

## How the form behaves

- Success: displays a confirmation and resets the form.
- Failure: keeps the visitor's message in the form and displays an error, so they can try again.
- The browser SDK applies a 10-second client-side throttle to reduce repeated submissions.
- The form does not attach files. Visitors can include a public link in the message if needed.

## Troubleshooting

- **EmailJS is not configured:** one or more placeholders in `emailjs-config.js` have not been replaced.
- **Public key / service / template error:** re-check all three IDs and make sure the template variable names match the ones above.
- **Origin/domain error:** add the exact local or live website origin to EmailJS Domains.
- **Email not arriving:** check the EmailJS dashboard email history and the inbox Spam/Junk folder; confirm the service is connected and tested.

Official documentation:
- https://www.emailjs.com/docs/
- https://www.emailjs.com/docs/sdk/send-form/
- https://www.emailjs.com/docs/faq/can-i-add-my-domain-to-allowlist/
