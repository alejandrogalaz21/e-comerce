## Context

Redis está levantado, conectado por `database/redis/` y comprobado por la página de estado, pero no
cachea nada. TK-020 lo introdujo con endpoints demostrativos; TK-021 decidió darle un uso real.

`GET /products` es el candidato natural: público, de solo lectura, y con TK-035 pasa a recibir una
petición por cada tecleo del buscador de la tienda.

## Goals / Non-Goals

**Goals:** que consultas repetidas no vuelvan a Postgres; que un cambio en el catálogo se vea de
inmediato; que una caída de Redis no rompa la tienda.

**Non-Goals:** cachear el detalle, los pedidos, o precalentar.

## Decisions

### La clave es la consulta normalizada, no la URL

Dos URLs distintas pueden pedir lo mismo: el orden de los parámetros varía, y `?q=a&q=b` es
equivalente a `?q=b&q=a` porque los términos se unen con OR. La clave se compone del **DTO ya
validado y normalizado**, con sus campos ordenados, de modo que peticiones equivalentes compartan
entrada y peticiones distintas no colisionen.

Usar la URL cruda habría sido más simple y habría cacheado peor: cada variación tipográfica sería
una entrada nueva.

### La invalidación borra todo el espacio del catálogo, no entradas concretas

Calcular qué consultas afecta un producto nuevo es un problema difícil: entra en cualquier búsqueda
cuyo término aparezca en su nombre, categoría o descripción, y en cualquier rango de precio que lo
contenga. Intentar ser preciso produciría entradas obsoletas silenciosas, que es el peor fallo
posible de una caché.

Se borra todo el prefijo del catálogo ante cualquier escritura. Es tosco y es correcto: el catálogo
se escribe poco y se lee mucho, que es exactamente cuando esta estrategia gana.

El import invalida **una vez al cerrar el batch**, no por fila: un import de 97 filas no debe
producir 97 borrados.

### La caché nunca decide si la petición se responde

Cada acceso a Redis va envuelto: si falla la lectura, se calcula contra Postgres; si falla la
escritura, se responde igual. La caché es una optimización, y una optimización que puede tumbar el
servicio no es una optimización.

Esto se prueba explícitamente, porque es la clase de cosa que solo se descubre cuando Redis se cae
en producción.

### TTL además de invalidación

La invalidación explícita cubre lo que pasa por el API. El TTL cubre lo que no: una escritura
directa en la base, una invalidación perdida por un fallo de Redis. Es el cinturón además de los
tirantes, y el coste es una ventana acotada de datos viejos en el peor caso.

## Risks / Trade-offs

- **Borrar todo el prefijo desperdicia entradas válidas** → Aceptado: el catálogo se lee mucho más
  de lo que se escribe, y la alternativa precisa arriesga servir datos obsoletos.
- **Una invalidación perdida serviría datos viejos** → Acotado por el TTL.
- **La caché podría enmascarar una consulta lenta** → La consulta sigue instrumentada por el logger;
  la caché no sustituye a los índices, que ya existen.
