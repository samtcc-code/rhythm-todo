import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import TodayView from "./pages/TodayView";
import SomedayView from "./pages/SomedayView";
import MatrixView from "./pages/MatrixView";
import AreaView from "./pages/AreaView";
import ProjectView from "./pages/ProjectView";
import TagView from "./pages/TagView";
import AllTasksView from "./pages/AllTasksView";
import { useIsMobile } from "./hooks/useMobile";

function DesktopRouter() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/" component={TodayView} />
        <Route path="/today" component={TodayView} />
        <Route path="/someday" component={SomedayView} />
        <Route path="/matrix" component={MatrixView} />
        <Route path="/all" component={AllTasksView} />
        <Route path="/area/:id" component={AreaView} />
        <Route path="/project/:id" component={ProjectView} />
        <Route path="/tag/:id" component={TagView} />
        <Route path="/404" component={NotFound} />
        <Route component={NotFound} />
      </Switch>
    </DashboardLayout>
  );
}

function MobileRouter() {
  // On mobile, only show the TodayView (Brain Dump + Sift focused)
  // All routes redirect to the same mobile experience
  return <TodayView />;
}

function Router() {
  const isMobile = useIsMobile();
  return isMobile ? <MobileRouter /> : <DesktopRouter />;
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
