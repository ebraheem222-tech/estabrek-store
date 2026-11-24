import AppRouter from "./routes/router";
import Toasts from "@/components/ui/Toasts";
import NewVersionNotice from "@/components/NewVersionNotice";
import ServerKeptNotice from "@/features/connect/ServerKeptNotice";

export default function App() {
  return (
    <>
      <AppRouter />
      <Toasts />
      <NewVersionNotice />
      <ServerKeptNotice />
    </>
  );
}
