import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { datadogRum } from '@datadog/browser-rum';
import './index.css'
import App from './App.tsx'

datadogRum.init({
  applicationId: import.meta.env.VITE_DD_APPLICATION_ID || '',
  clientToken: import.meta.env.VITE_DD_CLIENT_TOKEN || '',
  site: 'us5.datadoghq.com',
  service: 'car-park-ui',
  env: import.meta.env.MODE, // 'development' in dev, 'production' in build
  // Specify a version number to identify the deployed version of your application in Datadog
  // version: '1.0.0',
  sessionSampleRate: 100,
  sessionReplaySampleRate: 20,
  trackUserInteractions: true,
  trackResources: true,
  trackLongTasks: true,
  defaultPrivacyLevel: 'mask-user-input',
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
