import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, getToken } from "@/lib/auth";
import Layout from "./components/Layout";
import DashboardHome from "./pages/DashboardHome";
import Orders from "./pages/Orders";
import Books from "./pages/Books";
import Finances from "./pages/Finances";
import Settings from "./pages/Settings";
import Login from "./pages/Login";

// Send auth token with every API request
setAuthTokenGetter(getToken);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <h1 className="text-4xl font-bold text-foreground mb-2">404</h1>
      <p className="text-muted-foreground">Sahifa topilmadi</p>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/:rest*">
        <Layout>
          <Switch>
            <Route path="/" component={DashboardHome} />
            <Route path="/orders" component={Orders} />
            <Route path="/books" component={Books} />
            <Route path="/finances" component={Finances} />
            <Route path="/settings" component={Settings} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter>
        <AuthProvider>
          <Router />
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}
