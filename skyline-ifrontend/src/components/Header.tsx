import { Button } from "@/components/ui/button";
import { Link, useLocation } from "react-router-dom";
import { User, Menu, X, LogOut, Settings, CreditCard } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { NotificationBell } from "./NotificationBell";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center p-1">
              <div className="w-full h-full rounded-md bg-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">currency_exchange</span>
              </div>
            </div>
            <span className="text-xl font-bold text-foreground">SKYLINE</span>
            <span className="text-sm text-muted-foreground hidden sm:inline">Transfers</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link
              to="/"
              className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/') ? 'text-primary' : 'text-muted-foreground'
                }`}
            >
              Home
            </Link>
            <Link
              to="/send-money"
              className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/send-money') ? 'text-primary' : 'text-muted-foreground'
                }`}
            >
              Send Money
            </Link>
            <a
              href="/#exchange-rates"
              className={`text-sm font-medium transition-colors hover:text-primary text-muted-foreground`}
            >
              Rates
            </a>
            <Link
              to="/track"
              className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/track') ? 'text-primary' : 'text-muted-foreground'
                }`}
            >
              Track Transfer
            </Link>
            <Link
              to="/help"
              className={`text-sm font-medium transition-colors hover:text-primary ${isActive('/help') ? 'text-primary' : 'text-muted-foreground'
                }`}
            >
              Help
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated && user ? (
              <>
                <Button size="sm" className="bg-gradient-primary" asChild>
                  <Link to="/send-money">Send Money</Link>
                </Button>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/dashboard">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/transfers">
                        <CreditCard className="mr-2 h-4 w-4" />
                        My Transfers
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile">
                        <Settings className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/login">
                    <User className="h-4 w-4 mr-2" />
                    Login
                  </Link>
                </Button>
                <Button size="sm" className="bg-gradient-primary" asChild>
                  <Link to="/register">Get Started</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-border bg-background">
            <nav className="py-4 space-y-4">
              <Link
                to="/"
                className={`block px-4 py-2 text-sm font-medium transition-colors hover:text-primary ${isActive('/') ? 'text-primary bg-primary/5' : 'text-muted-foreground'
                  }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                to="/send-money"
                className={`block px-4 py-2 text-sm font-medium transition-colors hover:text-primary ${isActive('/send-money') ? 'text-primary bg-primary/5' : 'text-muted-foreground'
                  }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Send Money
              </Link>
              <a
                href="/#exchange-rates"
                className={`block px-4 py-2 text-sm font-medium transition-colors hover:text-primary text-muted-foreground`}
                onClick={() => setIsMenuOpen(false)}
              >
                Rates
              </a>
              <Link
                to="/track"
                className={`block px-4 py-2 text-sm font-medium transition-colors hover:text-primary ${isActive('/track') ? 'text-primary bg-primary/5' : 'text-muted-foreground'
                  }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Track Transfer
              </Link>
              <Link
                to="/help"
                className={`block px-4 py-2 text-sm font-medium transition-colors hover:text-primary ${isActive('/help') ? 'text-primary bg-primary/5' : 'text-muted-foreground'
                  }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Help
              </Link>
              <div className="px-4 pt-4 space-y-2">
                {isAuthenticated && user ? (
                  <>
                    <div className="px-2 py-2 text-sm flex justify-between items-center">
                      <div>
                        <p className="font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <NotificationBell />
                    </div>
                    <Button size="sm" className="w-full bg-gradient-primary" asChild>
                      <Link to="/send-money" onClick={() => setIsMenuOpen(false)}>
                        Send Money
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                      <Link to="/dashboard" onClick={() => setIsMenuOpen(false)}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Dashboard
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                      <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                        <Settings className="h-4 w-4 mr-2" />
                        Profile
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        handleLogout();
                        setIsMenuOpen(false);
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="sm" className="w-full justify-start" asChild>
                      <Link to="/login" onClick={() => setIsMenuOpen(false)}>
                        <User className="h-4 w-4 mr-2" />
                        Login
                      </Link>
                    </Button>
                    <Button size="sm" className="w-full bg-gradient-primary" asChild>
                      <Link to="/register" onClick={() => setIsMenuOpen(false)}>
                        Get Started
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};