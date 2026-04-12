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
  SidebarMenuItem,
  SidebarMenuButton,
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
  Sun,
  Moon,
  Calendar,
  Sunrise,
  Inbox,
  Grid3X3,
  LogOut,
  PanelLeft,
  FolderOpen,
  ClipboardList,
  Tag,
  Plus,
  MoreHorizontal,
  Layers,
  CheckSquare,
  User,
  Pencil,
  Trash2,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
            <h1 className="text-2xl font-semibold tracking-tight text-center text-foreground">Rhythm</h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Your morning and evening task rhythm. Sign in to continue.
            </p>
          </div>
          <Button onClick={() => { window.location.href = getLoginUrl(); }} size="lg" className="w-full shadow-lg hover:shadow-xl transition-all">
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

  const areasQuery = trpc.areas.list.useQuery();
  const projectsQuery = trpc.projects.list.useQuery();
  const tagsQuery = trpc.tags.list.useQuery();
  const usersQuery = trpc.users.list.useQuery();

  const utils = trpc.useUtils();

  // Create dialogs
  const [showCreateArea, setShowCreateArea] = useState(false);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newName, setNewName] = useState("");
  const [newProjectAreaId, setNewProjectAreaId] = useState<string>("none");
  const [newTagColor, setNewTagColor] = useState("#6366f1");

  // Edit dialogs
  const [editingArea, setEditingArea] = useState<{ id: number; name: string } | null>(null);
  const [editingProject, setEditingProject] = useState<{ id: number; name: string } | null>(null);
  const [editingTag, setEditingTag] = useState<{ id: number; name: string; color: string } | null>(null);
  const [editName, setEditName] = useState("");
  const [editTagColor, setEditTagColor] = useState("#6366f1");

  const createArea = trpc.areas.create.useMutation({
    onSuccess: () => { areasQuery.refetch(); setShowCreateArea(false); setNewName(""); },
  });
  const createProject = trpc.projects.create.useMutation({
    onSuccess: () => { projectsQuery.refetch(); setShowCreateProject(false); setNewName(""); setNewProjectAreaId("none"); },
  });
  const createTag = trpc.tags.create.useMutation({
    onSuccess: () => { tagsQuery.refetch(); setShowCreateTag(false); setNewName(""); setNewTagColor("#6366f1"); },
  });

  const updateArea = trpc.areas.update.useMutation({
    onSuccess: () => { areasQuery.refetch(); setEditingArea(null); },
  });
  const deleteArea = trpc.areas.delete.useMutation({
    onSuccess: () => { areasQuery.refetch(); },
  });
  const updateProject = trpc.projects.update.useMutation({
    onSuccess: () => { projectsQuery.refetch(); setEditingProject(null); },
  });
  const deleteProject = trpc.projects.delete.useMutation({
    onSuccess: () => { projectsQuery.refetch(); },
  });
  const updateTag = trpc.tags.update.useMutation({
    onSuccess: () => { tagsQuery.refetch(); setEditingTag(null); },
  });
  const deleteTag = trpc.tags.delete.useMutation({
    onSuccess: () => { tagsQuery.refetch(); },
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
    { icon: Sunrise, label: "Tomorrow", path: "/tomorrow" },
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
                <span className="font-semibold tracking-tight text-foreground truncate">Rhythm</span>
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

            {/* Owners */}
            {!isCollapsed && usersQuery.data && usersQuery.data.length > 0 && (
              <SidebarGroup>
                <div className="flex items-center justify-between px-4 pt-3 pb-1">
                  <SidebarGroupLabel className="p-0 h-auto text-xs uppercase tracking-wider text-muted-foreground">
                    Owners
                  </SidebarGroupLabel>
                </div>
                <SidebarGroupContent>
                  <SidebarMenu className="px-2">
                    {usersQuery.data.map(u => {
                      const active = location === `/owner/${u.id}`;
                      return (
                        <SidebarMenuItem key={u.id}>
                          <SidebarMenuButton
                            isActive={active}
                            onClick={() => { setLocation(`/owner/${u.id}`); if (isMobile) toggleSidebar(); }}
                            tooltip={u.name ?? ""}
                            className="h-11 md:h-8 font-normal text-base md:text-sm"
                          >
                            <User className={`h-5 w-5 md:h-3.5 md:w-3.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                            <span className="truncate">{u.name ?? u.email ?? `User ${u.id}`}</span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}

            {/* Areas */}
            <SidebarGroup>
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <SidebarGroupLabel className="p-0 h-auto text-xs uppercase tracking-wider text-muted-foreground">
                  Areas
                </SidebarGroupLabel>
                {!isCollapsed && (
                  <button
                    onClick={() => setShowCreateArea(true)}
                    className="h-5 w-5 flex items-center justify-center hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <SidebarGroupContent>
                <SidebarMenu className="px-2">
                  {areasQuery.data?.map(area => {
                    const active = location === `/area/${area.id}`;
                    return (
                      <SidebarMenuItem key={area.id}>
                        <div className="flex items-center group w-full">
                          <SidebarMenuButton
                            isActive={active}
                            onClick={() => { setLocation(`/area/${area.id}`); if (isMobile) toggleSidebar(); }}
                            tooltip={area.name}
                            className="h-11 md:h-8 font-normal text-base md:text-sm flex-1"
                          >
                            <FolderOpen className={`h-5 w-5 md:h-3.5 md:w-3.5 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                            <span className="truncate">{area.name}</span>
                          </SidebarMenuButton>
                          {!isCollapsed && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-all shrink-0 mr-1">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem onClick={() => { setEditingArea({ id: area.id, name: area.name }); setEditName(area.name); }}>
                                  <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => { if (confirm(`Delete "${area.name}"?`)) deleteArea.mutate({ id: area.id }); }}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Projects */}
            <SidebarGroup>
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <SidebarGroupLabel className="p-0 h-auto text-xs uppercase tracking-wider text-muted-foreground">
                  Projects
                </SidebarGroupLabel>
                {!isCollapsed && (
                  <button
                    onClick={() => setShowCreateProject(true)}
                    className="h-5 w-5 flex items-center justify-center hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <SidebarGroupContent>
                <SidebarMenu className="px-2">
                  {projectsQuery.data?.map(project => {
                    const active = location === `/project/${project.id}`;
                    return (
                      <SidebarMenuItem key={project.id}>
                        <div className="flex items-center group w-full">
                          <SidebarMenuButton
                            isActive={active}
                            onClick={() => { setLocation(`/project/${project.id}`); if (isMobile) toggleSidebar(); }}
                            tooltip={project.name}
                            className="h-11 md:h-8 font-normal text-base md:text-sm flex-1"
                          >
                            <ClipboardList className={`h-5 w-5 md:h-3.5 md:w-3.5 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                            <span className="truncate">{project.name}</span>
                          </SidebarMenuButton>
                          {!isCollapsed && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-all shrink-0 mr-1">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem onClick={() => { setEditingProject({ id: project.id, name: project.name }); setEditName(project.name); }}>
                                  <Pencil className="h-3.5 w-3.5 mr-2" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => { if (confirm(`Delete "${project.name}"?`)) deleteProject.mutate({ id: project.id }); }}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Tags */}
            <SidebarGroup>
              <div className="flex items-center justify-between px-4 pt-3 pb-1">
                <SidebarGroupLabel className="p-0 h-auto text-xs uppercase tracking-wider text-muted-foreground">
                  Tags
                </SidebarGroupLabel>
                {!isCollapsed && (
                  <button
                    onClick={() => setShowCreateTag(true)}
                    className="h-5 w-5 flex items-center justify-center hover:bg-accent rounded transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <SidebarGroupContent>
                <SidebarMenu className="px-2">
                  {tagsQuery.data?.map(tag => {
                    const active = location === `/tag/${tag.id}`;
                    return (
                      <SidebarMenuItem key={tag.id}>
                        <div className="flex items-center group w-full">
                          <SidebarMenuButton
                            isActive={active}
                            onClick={() => { setLocation(`/tag/${tag.id}`); if (isMobile) toggleSidebar(); }}
                            tooltip={tag.name}
                            className="h-11 md:h-8 font-normal text-base md:text-sm flex-1"
                          >
                            <div className="h-3.5 w-3.5 md:h-2.5 md:w-2.5 rounded-full shrink-0" style={{ backgroundColor: tag.color ?? "#6366f1" }} />
                            <span className="truncate">{tag.name}</span>
                          </SidebarMenuButton>
                          {!isCollapsed && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded hover:bg-accent text-muted-foreground hover:text-foreground transition-all shrink-0 mr-1">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem onClick={() => { setEditingTag({ id: tag.id, name: tag.name, color: tag.color ?? "#6366f1" }); setEditName(tag.name); setEditTagColor(tag.color ?? "#6366f1"); }}>
                                  <Pencil className="h-3.5 w-3.5 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => { if (confirm(`Delete "${tag.name}"?`)) deleteTag.mutate({ id: tag.id }); }}
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
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
                    <p className="text-sm font-medium truncate leading-none text-foreground">{user?.name || "-"}</p>
                    <p className="text-xs text-muted-foreground truncate mt-1">{user?.email || "-"}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={toggleTheme} className="cursor-pointer">
                  {theme === "dark" ? <Sun className="mr-2 h-4 w-4" /> : <Moon className="mr-2 h-4 w-4" />}
                  <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
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
            <button onClick={toggleTheme} className="h-11 w-11 flex items-center justify-center rounded-lg hover:bg-accent transition-colors">
              {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
          </div>
        )}
        <main className="flex-1 p-5 md:p-6 max-w-4xl">{children}</main>
      </SidebarInset>

      {/* Create Area */}
      <Dialog open={showCreateArea} onOpenChange={setShowCreateArea}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Area</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Personal, Sales" className="h-9" autoFocus
                onKeyDown={e => { if (e.key === "Enter" && newName.trim()) createArea.mutate({ name: newName.trim() }); }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateArea(false)}>Cancel</Button>
            <Button onClick={() => createArea.mutate({ name: newName.trim() })} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Area */}
      <Dialog open={!!editingArea} onOpenChange={v => { if (!v) setEditingArea(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Rename Area</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-9" autoFocus
                onKeyDown={e => { if (e.key === "Enter" && editName.trim() && editingArea) updateArea.mutate({ id: editingArea.id, name: editName.trim() }); }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingArea(null)}>Cancel</Button>
            <Button onClick={() => editingArea && updateArea.mutate({ id: editingArea.id, name: editName.trim() })} disabled={!editName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Project */}
      <Dialog open={showCreateProject} onOpenChange={setShowCreateProject}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Project</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Website Redesign" className="h-9" autoFocus
                onKeyDown={e => { if (e.key === "Enter" && newName.trim()) createProject.mutate({ name: newName.trim(), areaId: newProjectAreaId !== "none" ? parseInt(newProjectAreaId) : undefined }); }} />
            </div>
            <div className="space-y-2">
              <Label>Area (optional)</Label>
              <Select value={newProjectAreaId} onValueChange={setNewProjectAreaId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="No area" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No area</SelectItem>
                  {areasQuery.data?.map(area => (<SelectItem key={area.id} value={String(area.id)}>{area.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateProject(false)}>Cancel</Button>
            <Button onClick={() => createProject.mutate({ name: newName.trim(), areaId: newProjectAreaId !== "none" ? parseInt(newProjectAreaId) : undefined })} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project */}
      <Dialog open={!!editingProject} onOpenChange={v => { if (!v) setEditingProject(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Rename Project</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-9" autoFocus
                onKeyDown={e => { if (e.key === "Enter" && editName.trim() && editingProject) updateProject.mutate({ id: editingProject.id, name: editName.trim() }); }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProject(null)}>Cancel</Button>
            <Button onClick={() => editingProject && updateProject.mutate({ id: editingProject.id, name: editName.trim() })} disabled={!editName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Tag */}
      <Dialog open={showCreateTag} onOpenChange={setShowCreateTag}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Tag</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Urgent, Follow-up" className="h-9" autoFocus
                onKeyDown={e => { if (e.key === "Enter" && newName.trim()) createTag.mutate({ name: newName.trim(), color: newTagColor }); }} />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={newTagColor} onChange={e => setNewTagColor(e.target.value)} className="h-8 w-8 rounded border cursor-pointer" />
                <span className="text-sm text-muted-foreground">{newTagColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateTag(false)}>Cancel</Button>
            <Button onClick={() => createTag.mutate({ name: newName.trim(), color: newTagColor })} disabled={!newName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tag */}
      <Dialog open={!!editingTag} onOpenChange={v => { if (!v) setEditingTag(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Tag</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-9" autoFocus
                onKeyDown={e => { if (e.key === "Enter" && editName.trim() && editingTag) updateTag.mutate({ id: editingTag.id, name: editName.trim(), color: editTagColor }); }} />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2 items-center">
                <input type="color" value={editTagColor} onChange={e => setEditTagColor(e.target.value)} className="h-8 w-8 rounded border cursor-pointer" />
                <span className="text-sm text-muted-foreground">{editTagColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingTag(null)}>Cancel</Button>
            <Button onClick={() => editingTag && updateTag.mutate({ id: editingTag.id, name: editName.trim(), color: editTagColor })} disabled={!editName.trim()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
