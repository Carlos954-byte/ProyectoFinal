import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Empleado } from '../hooks/useEmpleados';
import { User, Briefcase, Mail, Phone, MapPin } from 'lucide-react';
import { useRoles } from '../hooks/useRoles';

interface EmpleadoModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (empleado: Partial<Empleado>) => Promise<any>;
    empleado?: Empleado | null;
    loading?: boolean;
    readOnly?: boolean;
}

export function EmpleadoModal({ isOpen, onClose, onSubmit, empleado, loading, readOnly = false }: EmpleadoModalProps) {
    const [formData, setFormData] = useState({
        tipo_documento: 'Cédula de Ciudadanía',
        cedula: '',
        nombre: '',
        cargo: '',
        correo: '',
        telefono: '',
        direccion: '',
        experiencia: ''
    });

    const { roles } = useRoles();

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (empleado) {
            setFormData({
                tipo_documento: empleado.tipo_documento || 'Cédula de Ciudadanía',
                cedula: empleado.cedula || '',
                nombre: empleado.nombre,
                cargo: empleado.cargo || '',
                correo: empleado.correo || '',
                telefono: empleado.telefono || '',
                direccion: empleado.direccion || '',
                experiencia: (empleado as any).experiencia || ''
            });
        } else {
            setFormData({
                tipo_documento: 'Cédula de Ciudadanía',
                cedula: '',
                nombre: '',
                cargo: '',
                correo: '',
                telefono: '',
                direccion: '',
                experiencia: ''
            });
        }
        setErrors({});
    }, [empleado, isOpen]);

    const validateForm = () => {
        const newErrors: Record<string, string> = {};

        if (!formData.tipo_documento) newErrors.tipo_documento = 'El tipo de documento es obligatorio';
        if (!formData.cedula.trim()) newErrors.cedula = 'La cédula/documento es obligatoria';
        if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio';
        if (!formData.correo.trim()) {
            newErrors.correo = 'El email es obligatorio';
        } else if (!/\S+@\S+\.\S+/.test(formData.correo)) {
            newErrors.correo = 'El email no es válido';
        }
        if (!formData.cargo.trim()) newErrors.cargo = 'El cargo es obligatorio';
        if (!formData.telefono.trim()) newErrors.telefono = 'El teléfono es obligatorio';
        if (!formData.direccion.trim()) newErrors.direccion = 'La dirección es obligatoria';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        const data = {
            ...formData,
            id_empleado: empleado?.id_empleado
        };

        const result = await onSubmit(data);
        if (result.success) {
            onClose();
        }
    };

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-dark-card border-dark-color">
                <DialogHeader>
                    <DialogTitle className="text-xl font-semibold text-dark-primary flex items-center gap-2">
                        <User className="w-5 h-5 text-blue-400" />
                        {readOnly ? 'Detalles del Empleado' : empleado ? 'Editar Empleado' : 'Nuevo Empleado'}
                    </DialogTitle>
                    <DialogDescription className="text-dark-secondary">
                        {readOnly ? 'Información detallada del empleado.' : empleado ? 'Actualiza los datos del empleado' : 'Ingresa la información básica del nuevo empleado'}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-dark-secondary text-xs">Nombre Completo *</Label>
                            <Input
                                value={formData.nombre}
                                onChange={(e) => handleChange('nombre', e.target.value)}
                                className={`bg-dark-hover border-dark-color text-dark-primary focus:border-dark-cta ${errors.nombre ? 'border-red-500' : ''}`}
                                placeholder="Nombre completo"
                                readOnly={readOnly}
                            />
                            {errors.nombre && <p className="text-red-400 text-sm">{errors.nombre}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-dark-secondary text-xs">Tipo Doc. *</Label>
                                <select
                                    value={formData.tipo_documento}
                                    onChange={(e) => handleChange('tipo_documento', e.target.value)}
                                    disabled={readOnly}
                                    className={`w-full h-10 px-3 py-2 bg-dark-hover border ${errors.tipo_documento ? 'border-red-500' : 'border-dark-color'} rounded-md text-sm text-dark-primary focus:border-dark-cta outline-none appearance-none`}
                                >
                                    <option value="Cédula de Ciudadanía">C.C.</option>
                                    <option value="Cédula de Extranjería">C.E.</option>
                                    <option value="Pasaporte">Pasaporte</option>
                                    <option value="NIT">NIT</option>
                                </select>
                                {errors.tipo_documento && <p className="text-red-400 text-sm">{errors.tipo_documento}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-dark-secondary text-xs">Documento *</Label>
                                <Input
                                    value={formData.cedula}
                                    onChange={(e) => handleChange('cedula', e.target.value)}
                                    className={`bg-dark-hover border-dark-color text-dark-primary focus:border-dark-cta ${errors.cedula ? 'border-red-500' : ''}`}
                                    placeholder="Número de documento"
                                    readOnly={readOnly}
                                />
                                {errors.cedula && <p className="text-red-400 text-sm">{errors.cedula}</p>}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-dark-secondary text-xs">Teléfono *</Label>
                            <div className="relative">
                                <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dark-secondary" />
                                <Input
                                    value={formData.telefono}
                                    onChange={(e) => handleChange('telefono', e.target.value)}
                                    className={`pl-10 bg-dark-hover border-dark-color text-dark-primary focus:border-dark-cta ${errors.telefono ? 'border-red-500' : ''}`}
                                    placeholder="300-123-4567"
                                    readOnly={readOnly}
                                />
                            </div>
                            {errors.telefono && <p className="text-red-400 text-sm">{errors.telefono}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-dark-secondary text-xs">Email *</Label>
                            <div className="relative">
                                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dark-secondary" />
                                <Input
                                    value={formData.correo}
                                    onChange={(e) => handleChange('correo', e.target.value)}
                                    className={`pl-10 bg-dark-hover border-dark-color text-dark-primary focus:border-dark-cta ${errors.correo ? 'border-red-500' : ''}`}
                                    placeholder="ejemplo@correo.com"
                                    readOnly={readOnly}
                                />
                            </div>
                            {errors.correo && <p className="text-red-400 text-sm">{errors.correo}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-dark-secondary text-xs">Dirección *</Label>
                            <div className="relative">
                                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-dark-secondary" />
                                <Input
                                    value={formData.direccion}
                                    onChange={(e) => handleChange('direccion', e.target.value)}
                                    className={`pl-10 bg-dark-hover border-dark-color text-dark-primary focus:border-dark-cta ${errors.direccion ? 'border-red-500' : ''}`}
                                    placeholder="Calle 123 # 45 - 67"
                                    readOnly={readOnly}
                                />
                            </div>
                            {errors.direccion && <p className="text-red-400 text-sm">{errors.direccion}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-dark-secondary text-xs flex items-center gap-1">
                                    <Briefcase className="w-3 h-3" /> Cargo *
                                </Label>
                                <select
                                    value={formData.cargo}
                                    onChange={(e) => handleChange('cargo', e.target.value)}
                                    disabled={readOnly || Boolean(empleado && (empleado.correo === 'josephballestas10@gmail.com' || empleado.cedula === '1001780874'))}
                                    className={`w-full h-10 px-3 py-2 bg-dark-hover border ${errors.cargo ? 'border-red-500' : 'border-dark-color'} rounded-md text-sm text-dark-primary focus:border-dark-cta outline-none appearance-none ${!formData.cargo && 'text-dark-secondary/70'} ${empleado && (empleado.correo === 'josephballestas10@gmail.com' || empleado.cedula === '1001780874') ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <option value="" disabled>Seleccionar rol</option>
                                    {roles
                                        .filter(rol => rol.nombre.toLowerCase() !== 'cliente')
                                        .map((rol) => (
                                            <option key={rol.id} value={rol.nombre} className="text-dark-primary">
                                                {rol.nombre}
                                            </option>
                                        ))}
                                </select>
                                {errors.cargo && <p className="text-red-400 text-sm">{errors.cargo}</p>}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-dark-secondary text-xs flex items-center gap-1">
                                    Experiencia Laboral
                                </Label>
                                <Input
                                    value={formData.experiencia}
                                    onChange={(e) => handleChange('experiencia', e.target.value)}
                                    className="bg-dark-hover border-dark-color text-dark-primary focus:border-dark-cta"
                                    placeholder="Ej: 5 años en clínica de pequeños animales"
                                    readOnly={readOnly}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="border-t border-dark-color pt-6 gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={onClose}
                            className="text-dark-secondary border border-dark-color hover:bg-dark-hover"
                        >
                            {readOnly ? 'Cerrar' : 'Cancelar'}
                        </Button>
                        {!readOnly && (
                            <Button
                                type="submit"
                                disabled={loading}
                                className="bg-dark-cta text-white hover:bg-blue-600 px-6"
                            >
                                {loading ? 'Procesando...' : empleado ? 'Actualizar' : 'Crear Empleado'}
                            </Button>
                        )}
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
