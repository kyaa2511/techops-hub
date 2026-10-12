import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ClerkAuthGuard } from '../auth/clerk-auth.guard';
import { TenantContextGuard } from '../auth/tenant-context.guard';
import { TenantRequest } from '../auth/tenant-context';
import {
  CreateCustomerDto,
  ListCustomersDto,
  UpdateCustomerDto,
} from './customer-request.dto';
import {
  CustomerListResponseDto,
  CustomerResponseDto,
} from './customer-response.dto';
import { CustomersService } from './customers.service';

@ApiTags('customers')
@ApiBearerAuth()
@ApiHeader({ name: 'X-Organization-Id', required: true })
@Controller('customers')
@UseGuards(ClerkAuthGuard, TenantContextGuard)
export class CustomersController {
  constructor(private readonly customers: CustomersService) {}
  private context(request: TenantRequest) {
    if (!request.tenantContext) throw new UnauthorizedException();
    return request.tenantContext;
  }
  @Get()
  @ApiOkResponse({ type: CustomerListResponseDto })
  async list(
    @Req() request: TenantRequest,
    @Query() query: ListCustomersDto,
  ): Promise<CustomerListResponseDto> {
    const result = await this.customers.list(this.context(request), query);
    return { ...result, items: result.items.map(CustomerResponseDto.from) };
  }
  @Get(':id')
  @ApiOkResponse({ type: CustomerResponseDto })
  async get(
    @Req() request: TenantRequest,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CustomerResponseDto> {
    return CustomerResponseDto.from(
      await this.customers.get(this.context(request), id),
    );
  }
  @Post()
  @ApiCreatedResponse({ type: CustomerResponseDto })
  async create(
    @Req() request: TenantRequest,
    @Body() body: CreateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return CustomerResponseDto.from(
      await this.customers.create(this.context(request), body),
    );
  }
  @Patch(':id')
  @ApiOkResponse({ type: CustomerResponseDto })
  async update(
    @Req() request: TenantRequest,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateCustomerDto,
  ): Promise<CustomerResponseDto> {
    return CustomerResponseDto.from(
      await this.customers.update(this.context(request), id, body),
    );
  }
}
