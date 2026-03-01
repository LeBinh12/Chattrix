import * as React from "react";
import GlobalStyles from "@mui/joy/GlobalStyles";
import Box from "@mui/joy/Box";
import Divider from "@mui/joy/Divider";
import List from "@mui/joy/List";
import Button from "@mui/joy/Button";
import ListItem from "@mui/joy/ListItem";
import ListItemButton, { listItemButtonClasses } from "@mui/joy/ListItemButton";
import ListItemContent from "@mui/joy/ListItemContent";
import Typography from "@mui/joy/Typography";
import Sheet from "@mui/joy/Sheet";
import { 
  LayoutGrid, 
  Users, 
  MessagesSquare, 
  ShieldCheck, 
  Lock, 
  Layers, 
  Table2, 
  LogOut,
  ChevronLeft
} from "lucide-react";

import { closeSidebar } from "../../utils/sidebar";
import { useNavigate, NavLink, useLocation } from "react-router-dom";
import { useRecoilValue } from "recoil";
import { userAtom } from "../../recoil/atoms/userAtom";
import UserAvatar from "../UserAvatar";
import {
  ADMIN_MENU_ITEMS,
  filterMenuByPermissions,
  type MenuItem,
} from "../../constants/menuPermissions";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useRecoilValue(userAtom);

  // Filter menu items dựa trên permissions của user
  const allowedMenuItems = React.useMemo(() => {
    return filterMenuByPermissions(
      ADMIN_MENU_ITEMS,
      user?.data.roles,
      user?.data.permissions
    );
  }, [user?.data.roles, user?.data.permissions]);

  const menuGroups = React.useMemo(() => {
    const groups = [
      {
        title: "TỔNG QUAN",
        items: allowedMenuItems.filter(item => ["dashboard"].includes(item.id))
      },
      {
        title: "QUẢN LÝ",
        items: allowedMenuItems.filter(item => ["user-management", "group-management"].includes(item.id))
      },
      {
        title: "PHÂN QUYỀN",
        items: allowedMenuItems.filter(item => ["role-management", "permission-management", "module-management", "permission-matrix"].includes(item.id))
      }
    ];
    return groups.filter(group => group.items.length > 0);
  }, [allowedMenuItems]);

  const handleLogout = () => {
    navigate("/");
  };

  return (
    <Sheet
      className="Sidebar"
      sx={{
        position: { xs: "fixed", md: "sticky" },
        transform: {
          xs: "translateX(calc(100% * (var(--SideNavigation-slideIn, 0) - 1)))",
          md: "none",
        },
        transition: "transform 0.4s, width 0.4s",
        zIndex: 1000,
        height: "100dvh",

        width: "var(--Sidebar-width)",
        top: 0,
        p: 1.5,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        borderRight: "1px solid",
        borderColor: "rgba(255, 255, 255, 0.15)",
        bgcolor: "#00568c",
      }}
    >
      <GlobalStyles
        styles={(theme) => ({
          ":root": {
            "--Sidebar-width": "260px",
            [theme.breakpoints.up("lg")]: {
              "--Sidebar-width": "260px",
            },
          },
        })}
      />
      <Box
        className="Sidebar-overlay"
        sx={{
          position: "fixed",
          zIndex: 9998,
          top: 0,
          left: 0,
          width: "100%",
          height: "100vh",
          opacity: "var(--SideNavigation-slideIn)",
          backgroundColor: "rgba(0,0,0,0.1)",
          backdropFilter: "blur(4px)",
          transition: "opacity 0.4s",
          transform: {
            xs: "translateX(calc(100% * (var(--SideNavigation-slideIn, 0) - 1) + var(--SideNavigation-slideIn, 0) * var(--Sidebar-width, 0px)))",
            lg: "translateX(-100%)",
          },
        }}
        onClick={() => closeSidebar()}
      />
      <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", px: 1, py: 1 }}>
        <div className="w-10 h-10 bg-white text-[#00568c] rounded-full flex items-center justify-center shrink-0 ring-4 ring-white/10">
          <Typography level="title-lg" sx={{ color: "inherit", fontWeight: "bold" }}>A</Typography>
        </div>
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Typography level="title-md" sx={{ color: "white", fontWeight: "bold", lineHeight: 1.2 }}>
            ADMIN PANEL
          </Typography>
          <Typography level="body-xs" sx={{ color: "white", opacity: 0.8 }}>
            Hệ thống quản trị
          </Typography>
        </Box>
      </Box>
      <Box
        sx={{
          minHeight: 0,
          overflow: "hidden auto",
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          [`& .${listItemButtonClasses.root}`]: {
            gap: 1.5,
            color: "rgba(255, 255, 255, 0.85)",
            borderRadius: "8px",
            transition: "all 0.2s ease",
            px: 1.5,
            py: 1.2,
            mx: 1,
            mb: 0.5,
            textDecoration: "none !important", 
            borderLeft: "3px solid transparent",
            "&:hover": {
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              color: "white",
              textDecoration: "none !important",
            },
            "&.Mui-selected": {
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              color: "white",
              fontWeight: 700,
              borderLeftColor: "white",
              textDecoration: "none !important",
              "&:hover": {
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                textDecoration: "none !important",
              },
            },
          },
        }}
      >
        <List
          size="sm"
          sx={{
            gap: 1,
            "--List-nestedInsetStart": "30px",
            "--ListItem-radius": "2px",
          }}
        >
          {menuGroups.map((group: { title: string; items: MenuItem[] }, gIdx: number) => (
            <React.Fragment key={gIdx}>
              <Typography
                level="body-xs"
                sx={{
                  color: "white",
                  opacity: 0.5,
                  fontWeight: "bold",
                  letterSpacing: "0.1em",
                  px: 2,
                  mt: gIdx > 0 ? 2 : 1,
                  mb: 1,
                  fontSize: "10px",
                }}
              >
                {group.title}
              </Typography>
              {group.items.map((menuItem: MenuItem) => {
                const getIcon = (id: string) => {
                  switch (id) {
                    case "dashboard": return <LayoutGrid size={20} />;
                    case "user-management": return <Users size={20} />;
                    case "group-management": return <MessagesSquare size={20} />;
                    case "role-management": return <ShieldCheck size={20} />;
                    case "permission-management": return <Lock size={20} />;
                    case "module-management": return <Layers size={20} />;
                    case "permission-matrix": return <Table2 size={20} />;
                    default: return null;
                  }
                };

                return (
                  <ListItem key={menuItem.id} sx={{ px: 0 }}>
                    <ListItemButton
                      role="menuitem"
                      component={NavLink}
                      to={menuItem.path}
                      selected={location.pathname === menuItem.path}
                      onClick={() => closeSidebar()}
                    >
                      {getIcon(menuItem.id)}
                      <ListItemContent>
                        <Typography level="title-sm" sx={{ color: "inherit", fontWeight: "inherit" }}>
                          {menuItem.label}
                        </Typography>
                      </ListItemContent>
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </React.Fragment>
          ))}
        </List>

        <List
          size="sm"
          sx={{
            mt: "auto",
            flexGrow: 0,
            "--ListItem-radius": "2px",
            "--List-gap": "8px",
            mb: 2,
          }}
        >
          {/* <ListItem>
            <ListItemButton>
              <SettingsRoundedIcon sx={{ color: "inherit" }} />
              <ListItemContent>
                <Typography level="title-sm">Cài Đặt</Typography>
              </ListItemContent>
            </ListItemButton>
          </ListItem> */}
        </List>
      </Box>
      <Divider sx={{ opacity: 0.1, bgcolor: "white" }} />
      <Box sx={{ 
        display: "flex", 
        gap: 1.5, 
        alignItems: "center", 
        p: 2,
        bgcolor: "#004a78",
        mx: -1.5,
        mb: -1.5
      }}>
        <UserAvatar
          avatar={user?.data.avatar}
          display_name={user?.data.display_name ?? ""}
          showOnlineStatus={false}
          size={36}
        />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            level="title-sm"
            sx={{
              color: "white",
              fontWeight: 700,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {user?.data.display_name}
          </Typography>
          <Typography level="body-xs" sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
            Admin
          </Typography>
        </Box>
        <button 
          onClick={() => handleLogout()}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <LogOut size={18} color="white" />
        </button>
      </Box>
    </Sheet>
  );
}
