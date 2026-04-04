import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import {
  Sun, Moon, Calendar, Inbox, Grid3X3, LogOut, PanelLeft,
  FolderOpen, ClipboardList, Tag, Plus, MoreHorizontal, Layers, CheckSquare,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "./ui/select";

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <CheckSquare className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-center text-foreground">
              Rhythm
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Your morning and evening task rhythm. Sign in to continue.
            </p>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();

  // Data queries
  const areasQuery = trpc.areas.list.useQuery();
  const projectsQuery = trpc.projects.list.useQuery();
  const tagsQuery = trpc.tags.list.useQuery();

  // Create dialogs
  const [showCreateArea, setShowCreateArea] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newName, setNewName] = useState("");
  const [newProjectAreaId, setNewProjectAreaId] = useState<string>("none");
  const [newTagColor, setNewTagColor] = useState("#6366f1");

  const createArea = trpc.areas.create.useMutation({
    onSuccess: () => { areasQuery.refetch(); setShowCreateArea(false); setNewName(""); },
  });
  const createProject = trpc.projects.create.useMutation({
    onSuccess: () => { projectsQuery.refetch(); setShowCreateProject(false); setNewName(""); setNewProjectAreaId("none"); },
  });
  const createTag = trpc.tags.create.useMutation({
    onSuccess: () => { tagsQuery.refetch(); setShowCreateTag(false); setNewName(""); setNewTagColor("#6366f1"); },
  });

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const navItems = [
    { icon: Calendar, label: "Today", path: "/" },
    { icon: Inbox, label: "Someday", path: "/someday" },
    { icon: Grid3X3, label: "Matrix", path: "/matrix" },
    { icon: Layers, label: "All Tasks", path: "/all" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location === "/" || location === "/today";
    return location === path;
  };

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-14 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed && (
                <span className="font-semibold tracking-tight text-foreground truncate">
                  Rhythm
                </span>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            {/* Main nav */}
            <SidebarGroup>
              <SidebarMenu className="px-2 py-1">
                {navItems.map(item => {
                  const active = isActive(item.path);
                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        isActive={active}
                        onClick={() => { setLocation(item.path); if (isMobile) toggleSidebar(); }}
                        tooltip={item.label}
                        className="h-12 md:h-9 transition-all font-normal text-base md:text-sm"
                      >
                        <item.icon className={`h-5 w-5 md:h-4 md:w-4 ${active ? "text-primary" : ""}`} />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>

            {/* Areas */}
            <SidebarGroup>
              <div className="flex items-center justify-between px-4 py-1">
                <SidebarGroupLabel className="p-0 text-xs uppercase tracking-wider text-muted-foreground">
                  Areas
                </SidebarGroupLabel>
                {!isCollapsed && (
                  <button
                    onClick={() => setShowCreateArea(true)}
                    className="h-10 w-10 md:h-5 md:w-5 flex items-center justify-center hover:bg-accent rounded-lg md:rounded transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-5 w-5 md:h-3.5 md:w-3.5" />
                  </button>
                )}
              </div>
              <SidebarGroupContent>
                <SidebarMenu className="px-2">
                  {areasQuery.data?.map(area => {
                    const active = location === `/area/${area.id}`;
                    return (
                      <SidebarMenuItem key={area.id}>
                        <SidebarMenuButton
                          isActive={active}
                          onClick={() => { setLocation(`/area/${area.id}`); if (isMobile) toggleSidebar(); }}
                          tooltip={area.name}
                          className="h-11 md:h-8 font-normal text-base md:text-sm"
                        >
                          <FolderOpen className={`h-5 w-5 md:h-3.5 md:w-3.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          <span className="truncate">{area.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Projects */}
            <SidebarGroup>
              <div className="flex items-center justify-between px-4 py-1">
                <SidebarGroupLabel className="p-0 text-xs uppercase tracking-wider text-muted-foreground">
                  Projects
                </SidebarGroupLabel>
                {!isCollapsed && (
                  <button
                    onClick={() => setShowCreateProject(true)}
                    className="h-10 w-10 md:h-5 md:w-5 flex items-center justify-center hover:bg-accent rounded-lg md:rounded transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-5 w-5 md:h-3.5 md:w-3.5" />
                  </button>
                )}
              </div>
              <SidebarGroupContent>
                <SidebarMenu className="px-2">
                  {projectsQuery.data?.map(project => {
                    const active = location === `/project/${project.id}`;
                    return (
                      <SidebarMenuItem key={project.id}>
                        <SidebarMenuButton
                          isActive={active}
                          onClick={() => { setLocation(`/project/${project.id}`); if (isMobile) toggleSidebar(); }}
                          tooltip={project.name}
                          className="h-11 md:h-8 font-normal text-base md:text-sm"
                        >
                          <ClipboardList className={`h-5 w-5 md:h-3.5 md:w-3.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                          <span className="truncate">{project.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Tags */}
            <SidebarGroup>
              <div className="flex items-center justify-between px-4 py-1">
                <SidebarGroupLabel className="p-0 text-xs uppercase tracking-wider text-muted-foreground">
                  Tags
                </SidebarGroupLabel>
                {!isCollapsed && (
                  <button
                    onClick={() => setShowCreateTag(true)}
                    className="h-10 w-10 md:h-5 md:w-5 flex items-center justify-center hover:bg-accent rounded-lg md:rounded transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-5 w-5 md:h-3.5 md:w-3.5" />
                  </button>
                )}
              </div>
              <SidebarGroupContent>
                <SidebarMenu className="px-2">
                  {tagsQuery.data?.map(tag => {
                    const active = location === `/tag/${tag.id}`;
                    return (
                      <SidebarMenuItem key={tag.id}>
                        <SidebarMenuButton
                          isActive={active}
                          onClick={() => { setLocation(`/tag/${tag.id}`); if (isMobile) toggleSidebar(); }}
                          tooltip={tag.name}
                          className="h-11 md:h-8 font-normal text-base md:text-sm"
                        >
                          <div
                            className="h-3.5 w-3.5 md:h-2.5 md:w-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: tag.color ?? "#6366f1" }}
                          />
                          <span className="truncate">{tag.name}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-8 w-8 border shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                      {user?.name?.charAt(0).toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-foreground">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                  {theme === "dark" ? (
                    <Sun className="mr-2 h-4 w-4" />
                  ) : (
                    <Moon className="mr-2 h-4 w-4" />
                  )}
                  <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b h-16 items-center justify-between bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-11 w-11 rounded-lg bg-background" />
              <span className="tracking-tight text-foreground font-medium text-lg">Rhythm</span>
            </div>
            <button
              onClick={toggleTheme}
              className="h-11 w-11 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
            >
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        )}
        <main className="flex-1 p-5 md:p-6 max-w-4xl">{children}</main>
      </SidebarInset>

      {/* Create Area Dialog */}
      <Dialog open={showCreateArea} onOpenChange={setShowCreateArea}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Area</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 md:space-y-4 py-2">
            <div className="space-y-3 md:space-y-2">
              <Label className="text-base md:text-sm">Name</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Personal, Sales, Client X"
                className="h-12 md:h-9 text-base md:text-sm rounded-xl md:rounded-md"
                autoFocus
                onKeyDown={e => {
                  if (e.key === "Enter" && newName.trim()) createArea.mutate({ name: newName.trim() });
                }}
              />
            </div>
          </div>
          <DialogFooter className="gap-3 md:gap-2">
            <Button variant="outline" onClick={() => setShowCreateArea(false)} className="h-12 md:h-9 text-base md:text-sm rounded-xl md:rounded-md">Cancel</Button>
            <Button onClick={() => createArea.mutate({ name: newName.trim() })} disabled={!newName.trim()} className="h-12 md:h-9 text-base md:text-sm rounded-xl md:rounded-md">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 md:space-y-4 py-2">
            <div className="space-y-3 md:space-y-2">
              <Label className="text-base md:text-sm">Name</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Website Redesign"
                className="h-12 md:h-9 text-base md:text-sm rounded-xl md:rounded-md"
                autoFocus
                onKeyDown={e => {
                  if (e.key === "Enter" && newName.trim()) {
                    createProject.mutate({
                      name: newName.trim(),
                      areaId: newProjectAreaId !== "none" ? parseInt(newProjectAreaId) : undefined,
                    });
                  }
                }}
              />
            </div>
            <div className="space-y-3 md:space-y-2">
              <Label className="text-base md:text-sm">Area (optional)</Label>
              <Select value={newProjectAreaId} onValueChange={setNewProjectAreaId}>
                <SelectTrigger className="h-12 md:h-9 text-base md:text-sm rounded-xl md:rounded-md">
                  <SelectValue placeholder="No area" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No area</SelectItem>
                  {areasQuery.data?.map(area => (
                    <SelectItem key={area.id} value={String(area.id)}>{area.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-3 md:gap-2">
            <Button variant="outline" onClick={() => setShowCreateProject(false)} className="h-12 md:h-9 text-base md:text-sm rounded-xl md:rounded-md">Cancel</Button>
            <Button
              onClick={() => createProject.mutate({
                name: newName.trim(),
                areaId: newProjectAreaId !== "none" ? parseInt(newProjectAreaId) : undefined,
              })}
              disabled={!newName.trim()}
              className="h-12 md:h-9 text-base md:text-sm rounded-xl md:rounded-md"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Tag Dialog */}
      <Dialog open={showCreateTag} onOpenChange={setShowCreateTag}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Tag</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 md:space-y-4 py-2">
            <div className="space-y-3 md:space-y-2">
              <Label className="text-base md:text-sm">Name</Label>
              <Input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Urgent, Follow-up"
                className="h-12 md:h-9 text-base md:text-sm rounded-xl md:rounded-md"
                autoFocus
                onKeyDown={e => {
                  if (e.key === "Enter" && newName.trim()) createTag.mutate({ name: newName.trim(), color: newTagColor });
                }}
              />
            </div>
            <div className="space-y-3 md:space-y-2">
              <Label className="text-base md:text-sm">Color</Label>
              <div className="flex gap-3 md:gap-2 items-center">
                <input
                  type="color"
                  value={newTagColor}
                  onChange={e => setNewTagColor(e.target.value)}
                  className="h-12 w-12 md:h-8 md:w-8 rounded-xl md:rounded border cursor-pointer"
                />
                <span className="text-base md:text-sm text-muted-foreground">{newTagColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-3 md:gap-2">
            <Button variant="outline" onClick={() => setShowCreateTag(false)} className="h-12 md:h-9 text-base md:text-sm rounded-xl md:rounded-md">Cancel</Button>
            <Button onClick={() => createTag.mutate({ name: newName.trim(), color: newTagColor })} disabled={!newName.trim()} className="h-12 md:h-9 text-base md:text-sm rounded-xl md:rounded-md">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
