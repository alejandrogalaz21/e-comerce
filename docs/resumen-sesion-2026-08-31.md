# Resumen de la sesión — 31 de agosto de 2026

> Guion pensado para leerse en voz alta. Unos cuatro minutos.

---

Empezamos con cuatro cosas que querías revisar del proyecto, y terminamos con dos tickets cerrados,
tres errores encontrados y el README corregido. Te cuento cómo fue.

## Por dónde empezamos

Traías cuatro puntos. Quitar los restos de la plantilla. Distinguir los mensajes de "no hay
productos" de "no hay resultados". La fecha de descarga del CSV en el README. Y uno que marcaste
como muy importante: que las compras en el frontend parecían datos falsos.

El tercero ya estaba hecho, la fecha estaba desde el veintiséis de agosto. Pero el cuarto resultó
más interesante de lo que parecía.

## El primer hallazgo

Investigué el flujo y la compra sí era real. El envío al servidor funcionaba perfecto, con clave de
idempotencia, manejo de errores de stock y de pago rechazado. Lo falso era todo lo que la rodeaba.

La pantalla de órdenes del dashboard mostraba veinte órdenes inventadas, con clientes que no
existen y estados como "reembolsado" o "cancelado" que tu sistema ni siquiera maneja. Las funciones
para leer las órdenes reales estaban escritas desde hacía semanas, y nadie las llamaba.

Tú lo confirmaste con una captura: tenías una compra real en la base de datos, por doscientos
veintinueve con noventa y siete, y la pantalla mostraba otra cosa completamente distinta.

## Lo que construimos primero

El ticket cuarenta y ocho conectó esa pantalla a la base de datos real. Pero le dimos una vuelta
más: en vez de una tabla cualquiera, el detalle de cada orden se diseñó como una superficie de
evidencia para quien evalúe el challenge.

Cada elemento responde a una pregunta. El precio congelado, contrastado contra el precio actual del
producto, responde a "¿el precio de una compra sobrevive a un cambio de catálogo?". La clave de
idempotencia responde a "¿y si envío la compra dos veces?". La referencia del cobro, con su prefijo
que dice "fake", responde a "el pago es falso, ¿cómo lo sé?". Y cada línea enlaza al producto para
comprobar que el stock bajó.

También quitamos la plantilla entera: la carpeta de datos falsos, las direcciones inventadas del
checkout, las tarjetas a nombre de gente que no existe, y el pie de página que anunciaba la
plantilla comercial.

Y ahí apareció algo que no habías pedido pero era necesario: el checkout mostraba opciones de envío
de diez y veinte dólares que nunca llegaban al servidor. Podías ver doscientos cuarenta y nueve en
pantalla mientras la base guardaba doscientos veintinueve. Las quitamos, así el número que ves es
el número que queda registrado.

## El segundo hallazgo, el que encontraste tú

Probaste la aplicación y dijiste que el inventario no se descontaba. Lo verifiqué y el descuento
funcionaba: el archivo original traía treinta unidades, vendiste ocho, la base decía veintidós.

Pero tenías razón en el síntoma. Lo que mentía era la vista. La lista de productos se guarda en
Redis durante cinco minutos, y comprar era la única operación que cambiaba el stock sin avisarle a
esa caché. Crear, editar, borrar e importar sí lo hacían. Comprar, no. Así que la tienda seguía
mostrando el número viejo.

Ese fue un bug real, y de los peores: hacía que la aplicación pareciera no descontar inventario,
que es justo lo que te hizo dudar de todo lo demás.

## El tercer hallazgo, el que encontró un test

Al escribir la prueba de esa corrección, descubrí que mi primera versión dejaba que un Redis caído
tumbara una venta que ya estaba confirmada. La orden estaba cobrada y guardada, y un fallo al
limpiar la caché la hacía fracasar. Lo aislé: ahora un Redis muerto cuesta frescura, nunca la venta.

## Lo que pediste después

Cuando te pregunté por el alcance, elegiste todo. Que se guardara la dirección de entrega, que
hubiera buscador, y que se arreglara la caché.

La dirección era teatro: el checkout la pedía y la tiraba a la basura. Nunca llegaba al servidor,
así que el detalle no podía mostrarla. Ahora se guarda en columnas propias, con migración, y crear
una orden sin dirección devuelve un error en vez de registrar algo que nadie puede entregar.

El buscador necesitaba servidor, porque el filtro solo aceptaba página y límite. Resolverlo en el
navegador habría filtrado únicamente la página visible, que es exactamente la clase de mentira que
ya habíamos corregido antes en la lista de productos.

Se busca por identificador de orden y por SKU o nombre de producto, porque una orden no tiene
cliente al que buscar. Y se busca contra las líneas vendidas, no contra el catálogo, para que
renombrar un producto no pierda sus órdenes históricas. Hay un test que lo comprueba.

## El último hallazgo

Al final me preguntaste si todo esto estaba documentado para el evaluador. Casi todo lo estaba, y
buena parte desde antes de esta sesión.

Pero al revisarlo encontré que los cuatro conteos de tests del README estaban desactualizados. Decía
cuatrocientos treinta y ocho tests en total. Eran cuatrocientos ochenta y dos. Números que no cuadran
en un documento de entrega son de lo primero que alguien verifica.

## Cómo quedó

Dos tickets archivados, el cuarenta y ocho y el cuarenta y nueve, con sus specs sincronizados.
Doscientos sesenta y cuatro tests en el servidor, ciento cuarenta y ocho en el navegador, todos en
verde, más tipos y lint limpios en ambos lados.

Verifiqué a mano el ciclo completo: importar, buscar, comprar, ver la orden, cambiar el precio y
confirmar que la línea conserva el precio de compra. También forcé un pago rechazado para
comprobar que muestra su motivo y ninguna referencia de cobro.

## Lo que queda pendiente

Una sola cosa: los tests de navegador con Playwright. Escribí cuatro nuevos y los tipos compilan,
pero nunca los ejecuté, porque esa configuración no levanta los servidores por su cuenta. Ahora que
el stack está corriendo, basta con ejecutarlos desde la carpeta web.

Y un detalle de datos: al verificar el ejemplo de la documentación dejé dieciocho órdenes de prueba
en tu base. Si prefieres entregar limpio, borrar el volumen de Docker y volver a importar el CSV te
deja de cero, que además es el primer paso del recorrido que el evaluador va a hacer.
