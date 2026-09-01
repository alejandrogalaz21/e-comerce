## 1. Persistencia del correo (BE)

- [x] 1.1 Migración `1788307200000-order-shipping-email.ts`: `ADD COLUMN IF NOT EXISTS "ship_email" varchar(255)` en `orders`, con su `down` (`DROP COLUMN IF EXISTS`). Sin backfill.
- [x] 1.2 Añadir `shipEmail: string | null` a la entidad `Order` (`@Column('varchar', { name: 'ship_email', length: 255, nullable: true })`) con su `@ApiProperty` nullable, junto al resto de campos `ship*`.
- [x] 1.3 Añadir `email` a `ShippingAddressDto`: `@Transform(trimText)`, `@IsEmail()`, `@IsNotEmpty()`, `@Length(1, 255)` y `@ApiProperty({ example: 'ada@example.com', maxLength: 255 })`. `@NoHtml()` no aplica: `@IsEmail()` ya excluye markup.
- [x] 1.4 Mapear `email` → `shipEmail` donde `orders.service` construye la orden desde `shippingAddress`.
- [x] 1.5 Tests de `create-order.dto.spec.ts`: una compra sin correo se rechaza; un correo mal formado se rechaza nombrando el campo; un correo con espacios alrededor se acepta ya recortado.

## 2. Búsqueda por datos de entrega (BE)

- [x] 2.1 Ampliar la expresión de `q` en `orders.service.findAll` con `ship_email`, `ship_address`, `ship_city`, `ship_state`, `ship_zip_code` y `ship_country`, reutilizando el parámetro `:contains` que ya existe. Sin índice nuevo (design).
- [x] 2.2 Actualizar la descripción de `q` en `OrderFiltersDto` y los `@ApiQuery` del controller para nombrar los campos nuevos.
- [x] 2.3 Tests en `orders.filters.spec.ts` contra base de datos real: encontrar una orden por correo, por un fragmento del correo y por su ciudad; comprobar que un texto que ninguna orden contiene no devuelve nada.

## 3. Captura del correo (FE)

- [x] 3.1 Añadir `email` a `NewAddressSchema` (`zod.string().min(1, ...).email(...)`) y a `defaultValues` de `address-new-form.tsx`.
- [x] 3.2 Añadir `Field.Text name="email" label="Email"` al formulario, en la misma retícula que `name` y `phoneNumber`, y propagarlo en `onCreate`.
- [x] 3.3 Extender `IAddressItem` (o el tipo que use el formulario) y `checkout-payment.tsx` para que el correo llegue a `shippingAddress` del payload de compra.
- [x] 3.4 Añadir `email` a `IShippingAddress`, a `ApiPurchase` (`shipEmail`) y al mapper `toShippingAddress` de `actions/purchase.mapper.ts`, tolerando su ausencia en órdenes viejas.

## 4. Presentación (FE)

- [x] 4.1 Mostrar el correo en el detalle de la compra (`purchase-details-address.tsx`), junto al teléfono, con ausencia explícita cuando la orden no lo tiene.
- [x] 4.2 Componente de teléfono para tabla y detalle: bandera derivada con `parsePhoneNumber(value)?.country` + `FlagIcon`, y el número tal cual si no se puede parsear.
- [x] 4.3 Rehacer las columnas de `purchase-list-view.tsx`: `Order`, `Customer` (solo nombre), `Phone` (columna propia con bandera), `Email`, `Address` (calle / ciudad, estado, CP, país), `Date`, `Items`, `Total`, `Status`, acciones. Ancho fijo en las de contenido invariable y `flex` en `Customer`, `Email` y `Address`.
- [x] 4.4 Ausencia explícita (`—`) en las columnas de las órdenes anteriores a estos datos, y truncado con tooltip donde el contenido no quepa.
- [x] 4.5 Actualizar el placeholder del buscador de la toolbar con los criterios nuevos.

## 5. Recibo en PDF desde el detalle

- [x] 5.1 Mover `receipt.ts` y `receipt-document.tsx` de `sections/checkout/` a `sections/purchase/`, exportarlos desde el índice de la sección y corregir el import de `checkout-view.tsx`.
- [x] 5.2 Añadir a `purchase-details-view.tsx` un botón "Download PDF" en la cabecera, con `LoadingButton` mientras se genera y aviso si falla.
- [x] 5.3 Comprobar que el recibo descargado desde el detalle coincide con el que entrega el checkout para la misma orden.

## 6. Cierre

- [x] 6.1 Actualizar `docs/testing/TC-05` con el payload vigente de `POST /orders` (correo incluido) y añadir el caso de compra sin correo.
- [x] 6.2 Ejecutar y dejar en verde: `npm test` del API (incluidos los specs contra base de datos), `vitest` y `eslint`/`tsc` del web.
- [x] 6.3 Verificar en la app levantada: comprar con correo, ver la orden en el listado con sus columnas nuevas, encontrarla buscando por correo y por ciudad, y descargar su recibo desde el detalle.
