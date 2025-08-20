'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import UnifiedLoginModal from '@/components/UnifiedLoginModal';
import MaterialUILoginModal from '@/components/MaterialUILoginModal';
import MaterialUILoginModalAnimated from '@/components/MaterialUILoginModalAnimated';
import { Badge } from '@/components/ui/badge';
import { LogIn, Shield, Users, Sparkles } from 'lucide-react';
import { Select, MenuItem, FormControl, InputLabel } from '@mui/material';

export default function LoginModalComparison() {
  const [showShadcn, setShowShadcn] = useState(false);
  const [showMUI, setShowMUI] = useState(false);
  const [showMUIAnimated, setShowMUIAnimated] = useState(false);
  const [modalMode, setModalMode] = useState<'regular' | 'admin' | 'staff'>('regular');
  const [animationStyle, setAnimationStyle] = useState<'bounce' | 'slide' | 'zoom' | 'flip'>('bounce');

  const openModal = (type: 'shadcn' | 'mui' | 'mui-animated', mode: 'regular' | 'admin' | 'staff') => {
    setModalMode(mode);
    if (type === 'shadcn') {
      setShowShadcn(true);
    } else if (type === 'mui') {
      setShowMUI(true);
    } else {
      setShowMUIAnimated(true);
    }
  };

  const modeConfigs = [
    { mode: 'regular' as const, icon: LogIn, color: 'bg-blue-100 text-blue-800', label: 'Regular Login' },
    { mode: 'admin' as const, icon: Shield, color: 'bg-red-100 text-red-800', label: 'Admin Login' },
    { mode: 'staff' as const, icon: Users, color: 'bg-purple-100 text-purple-800', label: 'Staff Login' }
  ];

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Login Modal Comparison</h1>
        <p className="text-gray-600">Compare shadcn/ui + Framer Motion vs Material UI Dialog implementations</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Shadcn/UI + Framer Motion */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>shadcn/ui + Framer Motion</span>
              <Badge variant="outline">Current</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-gray-600">
              <p>✅ Custom modal with Framer Motion animations</p>
              <p>✅ No Dialog component conflicts</p>
              <p>✅ Smooth backdrop and scale animations</p>
              <p>✅ Consistent with rest of UI (shadcn/ui)</p>
              <p>✅ Lightweight and performant</p>
            </div>
            
            <div className="pt-4 space-y-2">
              <p className="font-medium text-sm mb-2">Test all modes:</p>
              {modeConfigs.map(({ mode, icon: Icon, color, label }) => (
                <Button
                  key={mode}
                  onClick={() => openModal('shadcn', mode)}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                  <Badge className={`ml-auto ${color}`} variant="secondary">
                    {mode}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Material UI */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Material UI Dialog</span>
              <Badge variant="secondary">Alternative</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-gray-600">
              <p>✅ Built-in Dialog component</p>
              <p>✅ Material Design animations</p>
              <p>✅ Consistent with Material UI ecosystem</p>
              <p>⚠️ Different design language from shadcn/ui</p>
              <p>⚠️ Heavier bundle size (Material UI)</p>
            </div>
            
            <div className="pt-4 space-y-2">
              <p className="font-medium text-sm mb-2">Test all modes:</p>
              {modeConfigs.map(({ mode, icon: Icon, color, label }) => (
                <Button
                  key={mode}
                  onClick={() => openModal('mui', mode)}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                  <Badge className={`ml-auto ${color}`} variant="secondary">
                    {mode}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Material UI + Enhanced Animations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Material UI + Animations</span>
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                <Sparkles className="h-3 w-3 mr-1" />
                Enhanced
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-gray-600">
              <p>✅ Material UI Dialog with Framer Motion</p>
              <p>✅ Multiple animation styles</p>
              <p>✅ Advanced visual effects</p>
              <p>✅ Animated backgrounds</p>
              <p>✅ Interactive feedback</p>
            </div>

            {/* Animation style selector */}
            <FormControl fullWidth size="small" sx={{ mt: 2 }}>
              <InputLabel>Animation Style</InputLabel>
              <Select
                value={animationStyle}
                onChange={(e) => setAnimationStyle(e.target.value as any)}
                label="Animation Style"
              >
                <MenuItem value="bounce">Bounce</MenuItem>
                <MenuItem value="slide">Slide Up</MenuItem>
                <MenuItem value="zoom">Zoom</MenuItem>
                <MenuItem value="flip">3D Flip</MenuItem>
              </Select>
            </FormControl>
            
            <div className="pt-4 space-y-2">
              <p className="font-medium text-sm mb-2">Test all modes:</p>
              {modeConfigs.map(({ mode, icon: Icon, color, label }) => (
                <Button
                  key={mode}
                  onClick={() => openModal('mui-animated', mode)}
                  className="w-full justify-start"
                  variant="outline"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {label}
                  <Badge className={`ml-auto ${color}`} variant="secondary">
                    {mode}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Comparison Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="font-semibold mb-2">Current Implementation (shadcn/ui)</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Custom modal to avoid conflicts</li>
                <li>• Framer Motion animations</li>
                <li>• Consistent with app UI</li>
                <li>• Smaller bundle size</li>
                <li>• Full control over behavior</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Material UI Basic</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Material UI Dialog</li>
                <li>• Basic Framer Motion</li>
                <li>• Material Design style</li>
                <li>• Standard animations</li>
                <li>• Good compatibility</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Material UI Enhanced</h3>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Advanced animations</li>
                <li>• Multiple animation styles</li>
                <li>• Interactive feedback</li>
                <li>• Visual effects</li>
                <li>• Premium feel</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Recommendation:</strong> Stick with the current shadcn/ui + Framer Motion implementation. 
              It provides better consistency with the rest of the application, avoids mixing UI libraries, 
              and gives us more control over the modal behavior while maintaining a smaller bundle size.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <UnifiedLoginModal
        isOpen={showShadcn}
        onClose={() => setShowShadcn(false)}
        mode={modalMode}
      />

      <MaterialUILoginModal
        open={showMUI}
        onClose={() => setShowMUI(false)}
        mode={modalMode}
      />

      <MaterialUILoginModalAnimated
        open={showMUIAnimated}
        onClose={() => setShowMUIAnimated(false)}
        mode={modalMode}
        animationStyle={animationStyle}
      />
    </div>
  );
}