import AppRouter from "./routes/router";
import Toasts from "@/components/ui/Toasts";
import NewVersionNotice from "@/components/NewVersionNotice";

export default function App() {
  return (
    <>
      <AppRouter />
      <Toasts />
      <NewVersionNotice />
    </>
  );
}
