import { useRoute } from './router';
import { Agenda } from './screens/Agenda';
import { Coffees } from './screens/Coffees';
import { CompanyView } from './screens/Company';
import { Home } from './screens/Home';
import { Login, NoAccess, Splash } from './screens/Login';
import { PersonView } from './screens/Person';
import { BottomNav, Toast } from './shell';
import { useStore } from './store';

export default function App() {
  const { status, snapshot, error, dismissError } = useStore();
  const route = useRoute();

  if (status === 'signed-out') return <Login />;
  if (status === 'no-access') return <NoAccess />;
  if (status === 'loading' || !snapshot) return <Splash />;

  return (
    <div className="mx-auto min-h-screen max-w-xl pb-28">
      {route.name === 'home' && <Home />}
      {route.name === 'company' && <CompanyView groupKey={route.key} />}
      {route.name === 'person' && <PersonView id={route.id} />}
      {route.name === 'coffees' && <Coffees />}
      {route.name === 'agenda' && <Agenda />}
      {error && <Toast message={error} onClose={dismissError} />}
      <BottomNav active={route.name} />
    </div>
  );
}
