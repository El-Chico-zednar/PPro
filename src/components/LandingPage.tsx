import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ArrowRight, Mountain, Map, Timer, UploadCloud, Sparkles } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

const features = [
  {
    icon: Mountain,
    title: 'Planificación Inteligente',
    description:
      'Calcula ritmos óptimos teniendo en cuenta desnivel, distancia e intensidad deseada para cada sección del recorrido.',
  },
  {
    icon: Map,
    title: 'Visualiza Cada Kilómetro',
    description:
      'Explora mapas interactivos, gráficos de altimetría y tablas detalladas para entender cada segmento de tu carrera.',
  },
  {
    icon: Timer,
    title: 'Control Total del Tiempo',
    description:
      'Define objetivos de tiempo, ajusta estrategias de split negativos o positivos y obtén ritmos personalizados.',
  },
];

const steps = [
  {
    icon: UploadCloud,
    title: '1. Sube tu ruta GPX/TCX',
    description: 'Importa el recorrido de tu carrera o entrena con nuestros presets de distancia.',
  },
  {
    icon: Mountain,
    title: '2. Ajusta tu estrategia',
    description: 'Configura objetivo de tiempo, tipo de intervalos e intensidad de subida.',
  },
  {
    icon: Sparkles,
    title: '3. Obtén tu plan perfecto',
    description: 'Visualiza ritmos por tramo, tabla descargable y recomendaciones clave.',
  },
];

export function LandingPage({ onStart }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-muted/50 via-background to-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 py-16 space-y-16">
        <header className="text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/70 px-4 py-2 text-sm text-muted-foreground">
            <Badge variant="secondary">Beta</Badge>
            Planificador avanzado de ritmo para trail y asfalto
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-semibold">
              Convierte cada ruta en una estrategia ganadora
            </h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Sube tu recorrido, define tu objetivo y recibe un plan detallado con ritmos, tiempos
              y recomendaciones para conquistar tu próxima carrera.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="px-8 py-6 text-base" onClick={onStart}>
              Comenzar ahora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="px-8 py-6 text-base" onClick={onStart}>
              Ver demo rápida
            </Button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="p-6 space-y-4 border-border/60 bg-background/80">
              <feature.icon className="h-10 w-10 text-primary" />
              <h3 className="text-xl font-semibold">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </Card>
          ))}
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => (
            <Card key={step.title} className="p-6 space-y-4 border-dashed border-border bg-background/70">
              <div className="inline-flex items-center justify-center rounded-full bg-primary/10 p-3 w-12 h-12">
                <step.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="text-lg font-semibold mb-1">{step.title}</h4>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </Card>
          ))}
        </section>
      </div>
    </div>
  );
}


