'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface Step2FormData {
  nombre: string;
  apellido: string;
  telefono: string;
  street: string;
  streetNumber: string;
  country: string;
  countryId: string;
  province: string;
  provinceId: string;
  city: string;
  cityId: string;
  locality: string;
  localityId: string;
  postalCode: string;
}

interface SignupStep2Props {
  data: Step2FormData;
  onChange: (data: Step2FormData) => void;
}

export function SignupStep2({ data, onChange }: SignupStep2Props) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="nombre">Nombre del Centro *</Label>
          <Input
            id="nombre"
            value={data.nombre}
            onChange={(e) => onChange({ ...data, nombre: e.target.value })}
            required
            placeholder="Mi Centro"
          />
        </div>
        <div>
          <Label htmlFor="apellido">Apellido *</Label>
          <Input
            id="apellido"
            value={data.apellido}
            onChange={(e) => onChange({ ...data, apellido: e.target.value })}
            required
            placeholder="Pérez"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="telefono">Teléfono *</Label>
        <Input
          id="telefono"
          value={data.telefono}
          onChange={(e) => onChange({ ...data, telefono: e.target.value })}
          required
          placeholder="+54 11 XXXX-XXXX"
        />
      </div>

      <hr className="my-6 border-gray-200" />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="country">País *</Label>
          <Input
            id="country"
            value={data.country}
            onChange={(e) => onChange({ ...data, country: e.target.value })}
            required
            placeholder="Argentina"
          />
        </div>
        <div>
          <Label htmlFor="province">Provincia/Estado *</Label>
          <Input
            id="province"
            value={data.province}
            onChange={(e) => onChange({ ...data, province: e.target.value })}
            required
            placeholder="Buenos Aires"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city">Ciudad *</Label>
          <Input
            id="city"
            value={data.city}
            onChange={(e) => onChange({ ...data, city: e.target.value })}
            required
            placeholder="CABA"
          />
        </div>
        <div>
          <Label htmlFor="locality">Localidad *</Label>
          <Input
            id="locality"
            value={data.locality}
            onChange={(e) => onChange({ ...data, locality: e.target.value })}
            required
            placeholder="Recoleta"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="street">Calle *</Label>
        <Input
          id="street"
          value={data.street}
          onChange={(e) => onChange({ ...data, street: e.target.value })}
          required
          placeholder="Av. Santa Fe"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="streetNumber">Número *</Label>
          <Input
            id="streetNumber"
            value={data.streetNumber}
            onChange={(e) => onChange({ ...data, streetNumber: e.target.value })}
            required
            placeholder="1234"
          />
        </div>
        <div>
          <Label htmlFor="postalCode">Código Postal *</Label>
          <Input
            id="postalCode"
            value={data.postalCode}
            onChange={(e) => onChange({ ...data, postalCode: e.target.value })}
            required
            placeholder="1425"
          />
        </div>
      </div>
    </div>
  );
}
