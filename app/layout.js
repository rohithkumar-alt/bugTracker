import './globals.css';
import Sidebar from './components/Sidebar';
import { AuthProvider } from './components/AuthProvider';
import fs from 'fs';
import path from 'path';

export const metadata = {
  title: 'Tapza Bug Portal',
  description: 'Premium Bug Tracking for the Team',
};

export default function RootLayout({ children }) {
  // Load settings for the AuthProvider (assignees list)
  const settingsPath = path.join(process.cwd(), 'settings.json');
  const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

  return (
    <html lang="en">
      <body>
        <AuthProvider settings={settings}>
          <Sidebar />
          <main className="layout-main">
            <div className="content-container">
              {children}
            </div>
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}

