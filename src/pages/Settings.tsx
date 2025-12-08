import { useTheme, themeColorOptions, ThemeColor } from '@/hooks/useTheme';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { Check, Palette, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Settings() {
  const { themeColor, setThemeColor } = useTheme();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme-mode', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme-mode', 'light');
    }
  }, [isDarkMode]);

  // Load saved theme mode on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('theme-mode');
    if (savedMode === 'light') {
      setIsDarkMode(false);
    } else {
      setIsDarkMode(true);
    }
  }, []);

  return (
    <div className="container max-w-2xl py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">設定</h1>
        <p className="text-muted-foreground mt-1">アプリの外観をカスタマイズ</p>
      </div>

      <div className="space-y-6">
        {/* Dark Mode Toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              テーマモード
            </CardTitle>
            <CardDescription>
              ライトモードとダークモードを切り替えます
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sun className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm">ライト</span>
              </div>
              <Switch
                checked={isDarkMode}
                onCheckedChange={setIsDarkMode}
              />
              <div className="flex items-center gap-3">
                <span className="text-sm">ダーク</span>
                <Moon className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Theme */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="w-5 h-5" />
              カラーテーマ
            </CardTitle>
            <CardDescription>
              アプリ全体のアクセントカラーを選択してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {themeColorOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setThemeColor(option.value)}
                  className={cn(
                    'flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all duration-200',
                    themeColor === option.value
                      ? 'border-primary bg-primary/10'
                      : 'border-transparent hover:border-border hover:bg-muted/50'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      option.colorClass
                    )}
                  >
                    {themeColor === option.value && (
                      <Check className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <Label className="text-xs font-medium cursor-pointer">
                    {option.label}
                  </Label>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}