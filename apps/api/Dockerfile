# PHP 8.3 + Apache para kodanAPPS API
FROM php:8.3-apache

# Instalar extensiones PHP requeridas
RUN apt-get update && apt-get install -y \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libzip-dev \
    libonig-dev \
    libxml2-dev \
    libicu-dev \
    unzip \
    git \
    curl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
    pdo_mysql \
    mbstring \
    zip \
    gd \
    bcmath \
    intl \
    opcache \
    && a2enmod rewrite headers

# Configurar PHP para desarrollo
RUN echo "display_errors=On" >> /usr/local/php/php.ini-development \
    && echo "error_reporting=E_ALL" >> /usr/local/php/php.ini-development \
    && echo "log_errors=On" >> /usr/local/php/php.ini-development \
    && echo "memory_limit=256M" >> /usr/local/php/php.ini-development \
    && echo "max_execution_time=60" >> /usr/local/php/php.ini-development \
    && echo "upload_max_filesize=10M" >> /usr/local/php/php.ini-development \
    && echo "post_max_size=10M" >> /usr/local/php/php.ini-development

# Copiar configuración Apache
COPY apache.conf /etc/apache2/sites-available/000-default.conf

# Instalar Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Directorio de trabajo
WORKDIR /var/www/html

# Exponer puerto
EXPOSE 80

# Comando por defecto
CMD ["apache2-foreground"]