FROM nginx:alpine

# Copiar configuraciones del proxy inverso
COPY docker/nginx/prod.nginx.conf /etc/nginx/nginx.conf
COPY docker/nginx/security-headers.conf /etc/nginx/security-headers.conf

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
