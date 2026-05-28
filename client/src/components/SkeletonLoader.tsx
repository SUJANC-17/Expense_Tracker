import { Card, CardContent, CardHeader } from './ui/card';

export function SkeletonLoader() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto p-4 md:p-8 animate-pulse">
        
        {/* Header Skeleton */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="h-8 w-48 bg-white/10 rounded mb-2"></div>
            <div className="h-4 w-32 bg-white/5 rounded"></div>
          </div>
          <div className="h-10 w-24 bg-white/10 rounded-md"></div>
        </div>

        {/* Tabs Skeleton */}
        <div className="w-full h-12 bg-white/5 rounded-lg mb-8 flex items-center px-2 gap-2">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="flex-1 h-8 bg-white/10 rounded-md"></div>
          ))}
        </div>

        {/* Dashboard Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-white/10 rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-32 bg-white/20 rounded mb-2"></div>
                <div className="h-3 w-40 bg-white/5 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main List Area Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="h-6 w-32 bg-white/10 rounded"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="space-y-2">
                    <div className="h-5 w-40 bg-white/10 rounded"></div>
                    <div className="h-3 w-24 bg-white/5 rounded"></div>
                  </div>
                  <div className="h-6 w-16 bg-white/20 rounded"></div>
                </div>
              ))}
            </CardContent>
          </Card>
          
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="h-6 w-32 bg-white/10 rounded"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10">
                  <div className="space-y-2">
                    <div className="h-5 w-40 bg-white/10 rounded"></div>
                    <div className="h-3 w-24 bg-white/5 rounded"></div>
                  </div>
                  <div className="h-6 w-16 bg-white/20 rounded"></div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
