This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Run the API on a separate port so it does not conflict with the Next.js UI.
From the repository root, install the API dependencies and start it:

```bash
npm ci
PORT=3001 npx ts-node-dev src/server.ts
```

Keep Redis and the email worker running for queued emails to be processed.

In another terminal, start the UI from `async-email-ui`:

```bash
npm ci
NEXT_PUBLIC_API_URL=http://localhost:3001 npm run dev
```

`NEXT_PUBLIC_API_URL` sets the API base URL. It defaults to
`http://localhost:3000` when omitted and accepts a trailing slash. You can also
set it in `async-email-ui/.env.local`. Restart the development server after
changing it. For production, set it before `npm run build` because Next.js
embeds this public value in the browser bundle.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
