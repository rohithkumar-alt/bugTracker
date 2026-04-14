import './globals.css';
import Sidebar from './components/Sidebar';
import { AuthProvider } from './components/AuthProvider';

export const metadata = {
  title: 'Tapza Bug Portal',
  description: 'Premium Bug Tracking for the Team',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
};

export default function RootLayout({ children }) {
  // Use default settings for initial load; AuthProvider fetches live settings from DB
  const defaultSettings = {
    assignees: ["Rohith", "Tapza Admin", "Engineering Team"]
  };

  return (
    <html lang="en">
      <body>
        <AuthProvider settings={defaultSettings}>
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

