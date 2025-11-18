import { Button } from './ui/button';
import { Card } from './ui/card';
import { 
  Upload, 
  TrendingUp, 
  Map, 
  Clock, 
  Settings, 
  Zap,
  ArrowRight
} from 'lucide-react';

interface LandingPageProps {
  onGetStarted: () => void;
  onViewDemo?: () => void;
}

export function LandingPage({ onGetStarted, onViewDemo }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b">
        <div className="container mx-auto px-4 py-16 md:py-24 lg:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight">
                Planificador avanzado de ritmo para{' '}
                <span className="text-primary">trail y asfalto</span>
              </h1>
              <p className="text-xl md:text-2xl lg:text-3xl text-muted-foreground max-w-3xl mx-auto font-medium">
                Convierte cada ruta en una estrategia ganadora
              </p>
            </div>
            <p className="text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Sube tu recorrido, define tu objetivo y recibe un plan detallado con ritmos, 
              tiempos y recomendaciones para conquistar tu próxima carrera.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <Button size="lg" onClick={onGetStarted} className="text-base md:text-lg px-8 py-6">
                Comenzar ahora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              {onViewDemo && (
                <Button size="lg" variant="outline" onClick={onViewDemo} className="text-base md:text-lg px-8 py-6">
                  Ver demo rápida
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 lg:py-32 bg-muted/50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Planificación Inteligente
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Todo lo que necesitas para optimizar tu estrategia de carrera
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              <Card className="p-8 text-center space-y-5 hover:shadow-lg transition-shadow">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-semibold">Cálculo Inteligente</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Calcula ritmos óptimos teniendo en cuenta desnivel, distancia e intensidad 
                  deseada para cada sección del recorrido.
                </p>
              </Card>

              <Card className="p-8 text-center space-y-5 hover:shadow-lg transition-shadow">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Map className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-semibold">Visualiza Cada Kilómetro</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Explora mapas interactivos, gráficos de altimetría y tablas detalladas 
                  para entender cada segmento de tu carrera.
                </p>
              </Card>

              <Card className="p-8 text-center space-y-5 hover:shadow-lg transition-shadow">
                <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl md:text-2xl font-semibold">Control Total del Tiempo</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Define objetivos de tiempo, ajusta estrategias de split negativos o positivos 
                  y obtén ritmos personalizados.
                </p>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 md:py-24 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12 md:mb-20">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                Cómo Funciona
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                En tres simples pasos tendrás tu estrategia perfecta
              </p>
            </div>
            <div className="space-y-8 md:space-y-12">
              {/* Step 1 */}
              <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-center">
                <div className="flex-shrink-0 mx-auto md:mx-0">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl md:text-4xl font-bold shadow-lg">
                    1
                  </div>
                </div>
                <Card className="flex-1 p-8 md:p-10 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col sm:flex-row items-start gap-6">
                    <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl md:text-3xl font-semibold mb-3 md:mb-4">
                        Sube tu ruta GPX/TCX
                      </h3>
                      <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                        Importa el recorrido de tu carrera o entrena con nuestros presets de distancia.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-center">
                <div className="flex-shrink-0 mx-auto md:mx-0">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl md:text-4xl font-bold shadow-lg">
                    2
                  </div>
                </div>
                <Card className="flex-1 p-8 md:p-10 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col sm:flex-row items-start gap-6">
                    <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Settings className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl md:text-3xl font-semibold mb-3 md:mb-4">
                        Ajusta tu estrategia
                      </h3>
                      <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                        Configura objetivo de tiempo, tipo de intervalos e intensidad de subida.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-center">
                <div className="flex-shrink-0 mx-auto md:mx-0">
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl md:text-4xl font-bold shadow-lg">
                    3
                  </div>
                </div>
                <Card className="flex-1 p-8 md:p-10 hover:shadow-lg transition-shadow">
                  <div className="flex flex-col sm:flex-row items-start gap-6">
                    <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Zap className="h-8 w-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl md:text-3xl font-semibold mb-3 md:mb-4">
                        Obtén tu plan perfecto
                      </h3>
                      <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                        Visualiza ritmos por tramo, tabla descargable y recomendaciones clave.
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 lg:py-32 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6 md:space-y-8">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight">
              ¿Listo para mejorar tu estrategia de carrera?
            </h2>
            <p className="text-lg md:text-xl lg:text-2xl opacity-90 max-w-2xl mx-auto">
              Comienza a planificar tu próxima carrera ahora mismo
            </p>
            <div className="pt-4">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={onGetStarted}
                className="text-base md:text-lg px-8 py-6"
              >
                Comenzar ahora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

