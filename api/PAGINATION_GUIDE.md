# Guía de Paginación Estandarizada

## Descripción

Este proyecto utiliza un sistema de paginación estandarizado para mantener consistencia en todas las respuestas paginadas de la API.

## Componentes

### 1. **PaginationDTO** (`src/common/dto/pagination.dto.ts`)
DTO base para recibir parámetros de paginación en las peticiones:
- `page`: Número de página (string)
- `limit`: Cantidad de registros por página (string)

### 2. **PaginationHelper** (`src/common/pagination/pagination.helper.ts`)
Helper para parsear y calcular parámetros de paginación:
- Convierte strings a números
- Calcula el offset automáticamente
- Aplica valores por defecto (página 1, límite 10)

### 3. **PaginationResponseBuilder** (`src/common/pagination/pagination-response.builder.ts`)
Builder para construir respuestas paginadas estandarizadas con la siguiente estructura:
```json
{
  "data": [...],
  "pagination": {
    "total": 100,
    "per_page": 10,
    "current_page": 1,
    "last_page": 10,
    "from": 1,
    "to": 10
  }
}
```

## Cómo Usar

### En el Servicio

1. **Inyectar el builder** en el constructor:
```typescript
constructor(
  @InjectRepository(MyEntity)
  private readonly myRepository: Repository<MyEntity>,
  private readonly paginationBuilder: PaginationResponseBuilder<MyEntity>
) {}
```

2. **Usar PaginationHelper para parsear** los parámetros:
```typescript
async findAll(paginationDto: PaginationDTO) {
  const { page, limit, offset } = PaginationHelper.parse(paginationDto)
  
  // ... tu lógica de consulta
}
```

3. **Para consultas simples** con TypeORM:
```typescript
async findAll(paginationDto: PaginationDTO) {
  const { page, limit, offset } = PaginationHelper.parse(paginationDto)

  const [data, total] = await this.myRepository.findAndCount({
    take: limit,
    skip: offset,
    // ... otras opciones
  })

  return this.paginationBuilder.build(data, total, page, limit)
}
```

4. **Para consultas con QueryBuilder**:
```typescript
async findAll(paginationDto: PaginationDTO) {
  const { page, limit, offset } = PaginationHelper.parse(paginationDto)

  const query = this.myRepository.createQueryBuilder('entity')
  
  // Aplicar filtros y ordenamiento
  query.where('entity.status = :status', { status: 'active' })
  query.orderBy('entity.createdAt', 'DESC')
  
  // Obtener total antes de aplicar paginación
  const total = await query.getCount()
  
  // Aplicar paginación
  query.take(limit)
  query.skip(offset)
  
  const data = await query.getMany()

  return this.paginationBuilder.build(data, total, page, limit)
}
```

## Ejemplos Completos

### Ejemplo 1: Paginación Simple
```typescript
@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly paginationBuilder: PaginationResponseBuilder<Product>
  ) {}

  async findAll(paginationDto: PaginationDTO) {
    const { page, limit, offset } = PaginationHelper.parse(paginationDto)

    const [products, total] = await this.productRepository.findAndCount({
      take: limit,
      skip: offset,
      relations: ['category']
    })

    return this.paginationBuilder.build(products, total, page, limit)
  }
}
```

### Ejemplo 2: Paginación con Filtros
```typescript
@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly paginationBuilder: PaginationResponseBuilder<User>
  ) {}

  async findAll(params: UserFiltersDTO) {
    const { page, limit, name, status } = params
    const { page: parsedPage, limit: parsedLimit, offset } = 
      PaginationHelper.parse({ page, limit })

    const query = this.userRepository.createQueryBuilder('user')
    
    if (name) {
      query.andWhere('LOWER(user.name) LIKE :name', { 
        name: `%${name.toLowerCase()}%` 
      })
    }
    
    if (status) {
      query.andWhere('user.status = :status', { status })
    }
    
    const total = await query.getCount()
    
    query.take(parsedLimit)
    query.skip(offset)
    
    const users = await query.getMany()

    return this.paginationBuilder.build(users, total, parsedPage, parsedLimit)
  }
}
```

## Ventajas

1. **Consistencia**: Todas las respuestas paginadas tienen la misma estructura
2. **Reutilización**: No repetir lógica de cálculo de paginación
3. **Mantenibilidad**: Cambios centralizados en un solo lugar
4. **Tipado**: TypeScript garantiza el tipo correcto de datos
5. **Buenas Prácticas**: Separación de responsabilidades (helper + builder)

## Notas Importantes

- El `PaginationModule` es **Global**, no necesitas importarlo en cada módulo
- Los valores por defecto son: `page = 1`, `limit = 10`
- El builder calcula automáticamente: `last_page`, `from`, y `to`
- Para transformar datos antes de paginar, hazlo antes de llamar al builder
