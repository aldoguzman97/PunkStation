import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

export default function AppLayout() {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-layout__main">
        <TopBar />
        <div className="app-layout__content grid-bg">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
