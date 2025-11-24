import { Button } from './ui/button';
import { Card } from './ui/card';
import { ArrowRight, Target, TrendingUp, Map, Clock } from 'lucide-react';

interface LandingPageProps {
    onGetStarted: () => void;
    onViewDemo: () => void;
}

export function LandingPage({ onGetStarted, onViewDemo }: LandingPageProps) {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted">
            <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
                {/* Hero Section */}
                <div className="text-center mb-16">
                    {/* Logo */}
                    <div className="flex justify-center mb-8">
                        <svg width="300" height="64" viewBox="0 0 250 53" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M33.527 0H250L216.473 53H0L33.527 0Z" fill="#797979" />
                        </svg>
                    </div>

                    <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                        PacePro Running Planner
                    </h1>

                    <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
                        Planifica tu estrategia de ritmo perfecta para tu próxima carrera
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <Button
                            size="lg"
                            onClick={onGetStarted}
                            className="text-lg px-8 py-6"
                        >
                            Comenzar
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>

                        <Button
                            size="lg"
                            variant="outline"
                            onClick={onViewDemo}
                            className="text-lg px-8 py-6"
                        >
                            Ver Demo
                        </Button>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    <Card className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <Target className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="font-semibold mb-2">Objetivo Personalizado</h3>
                            <p className="text-sm text-muted-foreground">
                                Define tu tiempo objetivo y ajusta tu estrategia de ritmo
                            </p>
                        </div>
                    </Card>

                    <Card className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <TrendingUp className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="font-semibold mb-2">Análisis de Elevación</h3>
                            <p className="text-sm text-muted-foreground">
                                Ajusta tu ritmo según el desnivel del recorrido
                            </p>
                        </div>
                    </Card>

                    <Card className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <Map className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="font-semibold mb-2">Visualización Interactiva</h3>
                            <p className="text-sm text-muted-foreground">
                                Mapa y gráficos para visualizar tu estrategia
                            </p>
                        </div>
                    </Card>

                    <Card className="p-6 hover:shadow-lg transition-shadow">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                <Clock className="h-6 w-6 text-primary" />
                            </div>
                            <h3 className="font-semibold mb-2">Estrategias Guardadas</h3>
                            <p className="text-sm text-muted-foreground">
                                Guarda y gestiona múltiples planes de carrera
                            </p>
                        </div>
                    </Card>
                </div>

                {/* How It Works */}
                <div className="text-center mb-16">
                    <h2 className="text-3xl font-bold mb-8">¿Cómo funciona?</h2>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4">
                                1
                            </div>
                            <h3 className="font-semibold mb-2">Sube tu recorrido</h3>
                            <p className="text-sm text-muted-foreground">
                                Carga un archivo GPX o TCX de tu carrera, o selecciona una carrera popular
                            </p>
                        </div>

                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4">
                                2
                            </div>
                            <h3 className="font-semibold mb-2">Configura tu estrategia</h3>
                            <p className="text-sm text-muted-foreground">
                                Define tu tiempo objetivo y ajusta los parámetros de ritmo
                            </p>
                        </div>

                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4">
                                3
                            </div>
                            <h3 className="font-semibold mb-2">Ejecuta tu plan</h3>
                            <p className="text-sm text-muted-foreground">
                                Visualiza tu estrategia en el mapa, gráfico y tabla detallada
                            </p>
                        </div>
                    </div>
                </div>

                {/* CTA Section */}
                <Card className="p-8 md:p-12 text-center bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
                    <h2 className="text-3xl font-bold mb-4">
                        ¿Listo para optimizar tu próxima carrera?
                    </h2>
                    <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
                        Crea tu primera estrategia de ritmo y alcanza tus objetivos
                    </p>
                    <Button
                        size="lg"
                        onClick={onGetStarted}
                        className="text-lg px-8 py-6"
                    >
                        Comenzar Ahora
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                </Card>
            </div>
        </div>
    );
}
