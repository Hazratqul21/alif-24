import { setAuthTokenGetter } from "@workspace/api-client-react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, getToken } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import BookDetail from "@/pages/BookDetail";
import BookNew from "@/pages/BookNew";
import MapPage from "@/pages/MapPage";
import Stores from "@/pages/Stores";
import StoreDetail from "@/pages/StoreDetail";
import StoreNew from "@/pages/StoreNew";
import StoreCatalogNew from "@/pages/StoreCatalogNew";
import StoreReaders from "@/pages/StoreReaders";
import Profile from "@/pages/Profile";
import Analytics from "@/pages/Analytics";
import Invoices from "@/pages/Invoices";
import Admin from "@/pages/Admin";
import Ozodbek from "@/pages/Ozodbek";
import PaymentSuccess from "@/pages/PaymentSuccess";
import CartPage from "@/pages/CartPage";
import MessagesPage from "@/pages/MessagesPage";
import NotificationsPage from "@/pages/NotificationsPage";
import SubscriptionPage from "@/pages/SubscriptionPage";
import StoreOwnerPay from "@/pages/StoreOwnerPay";
import SSOHandler from "@/pages/SSOHandler";
import { CartProvider } from "@/lib/cart";

// Send auth token with every API request
setAuthTokenGetter(getToken);

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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
      <a href={BASE + "/"} className="mt-4 text-primary hover:underline text-sm">Bosh sahifaga qaytish</a>
    </div>
  );
}

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/sso" component={SSOHandler} />
        <Route path="/register" component={Register} />
        <Route path="/books/new" component={BookNew} />
        <Route path="/books/:id" component={BookDetail} />
        <Route path="/map" component={MapPage} />
        <Route path="/stores/new" component={StoreNew} />
        <Route path="/stores/:id/catalog/new" component={StoreCatalogNew} />
        <Route path="/stores/:id/readers" component={StoreReaders} />
        <Route path="/stores/:id/invoices" component={Invoices} />
        <Route path="/stores/:id" component={StoreDetail} />
        <Route path="/stores" component={Stores} />
        <Route path="/profile" component={Profile} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/admin" component={Admin} />
        <Route path="/ozodbek" component={Ozodbek} />
        <Route path="/payment/success" component={PaymentSuccess} />
        <Route path="/cart" component={CartPage} />
        <Route path="/messages/:userId" component={MessagesPage} />
        <Route path="/messages" component={MessagesPage} />
        <Route path="/notifications" component={NotificationsPage} />
        <Route path="/stores/:storeId/subscribe" component={SubscriptionPage} />
        <Route path="/stores/:storeId/activate" component={StoreOwnerPay} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WouterRouter base={BASE}>
        <AuthProvider>
          <CartProvider>
            <Router />
          </CartProvider>
        </AuthProvider>
      </WouterRouter>
    </QueryClientProvider>
  );
}
