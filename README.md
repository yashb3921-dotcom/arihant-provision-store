# Arihant Provision Stores: online grocery store

React + Vite + Tailwind, with Firebase (Auth + Firestore), Cloudinary for photos, and OpenStreetMap services for maps. All free.

Three dashboards in one site:

| Dashboard | Who | URL |
|---|---|---|
| Customer | Shoppers | `/account` |
| Admin | Shop owner | `/admin` |
| Delivery | 3 delivery staff | `/delivery` |

## 1. Run it on your computer

```
npm install
npm run dev
```

Open http://localhost:5173. The `.env` file already holds your Firebase and Cloudinary settings.
(If PowerShell blocks npm, run once: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`)

## 2. One-time Firebase setup (console.firebase.google.com, project arihant-store-31)

1. **Build > Authentication > Get started.** Enable **Email/Password** and **Google**.
2. **Build > Firestore Database > Create database.** Region: `asia-south1 (Mumbai)`. Start in production mode.
3. **Firestore > Rules tab.** Paste the full contents of `firestore.rules` and press **Publish**. Without this the site cannot read or write anything.
4. **Authentication > Settings > Authorized domains.** `localhost` and `arihant-store-31.web.app` are already there. Add your own domain later if you buy one.

## 3. Make yourself the admin (one time)

1. Open the site, go to **Login > Create account** with the owner's email.
2. In Firestore, open `users`, click your document, and change the field `role` from `customer` to `admin`.
3. Refresh the site. You will see **Admin** in the top menu.
4. In Admin, press **Add sample products** on the Overview page to see the shop filled, or add your own under **Products**.

## 4. Add the 3 delivery staff

1. Each person creates an account on the website with their own email.
2. In **Admin > Users & staff**, change their role to `delivery`.
3. In **Admin > Orders**, open an order and choose the delivery person.

## 5. Put it online for free

```
npm install -g firebase-tools
firebase login
npm run build
firebase deploy
```

Your site will be at https://arihant-store-31.web.app

## Change prices and rules later

**Admin > Settings:** charge per km (₹10), free delivery limit (₹399), maximum distance (7 km), minimum order, opening hours, shop on/off switch, phone and address.

## Languages

English, Hindi and Marathi. Buttons and messages are translated. For product and category names, fill in the Hindi and Marathi name fields in Admin; if left empty, the English name is shown.

## Good to know

- No Cloud Functions are used (they need a paid plan). Order totals are calculated in the browser, so check each order before you accept it. Accepting an order reduces stock automatically.
- Distance uses the free OSRM and OpenStreetMap servers. They are fine for a small shop, but if they are slow the site falls back to straight-line distance x 1.3.
- Keep `.env` out of GitHub (it is already in `.gitignore`).
