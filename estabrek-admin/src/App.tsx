import AppRouter from "./routes/router";
import Toasts from "@/components/ui/Toasts";

export default function App() {
  return (
    <>
      <AppRouter />
      <Toasts />
    </>
  );
}
