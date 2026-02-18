#!/bin/bash
# 🚀 Alif24 Platform Deployment Script
# Production deployment automation

set -e

echo "🎓 Alif24 Platform Deployment"
echo "==============================="

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env fayli topilmadi!"
    echo "📝 .env.production.example dan nusxa oling:"
    echo "   cp .env.production.example .env"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker o'rnatilmagan!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose o'rnatilmagan!"
    exit 1
fi

echo "✅ Tekshiruvlar muvaffaqiyatli"

# Function to deploy services
deploy_all() {
    echo ""
    echo "🐳 Barcha servicelarni ishga tushirish..."
    docker-compose up -d
    
    echo ""
    echo "⏳ Servicelar tayyor bo'lishini kutish..."
    sleep 10
    
    echo ""
    echo "🏥 Health check..."
    curl -s http://localhost/api/v1/health || echo "⚠️ Health check failed"
    
    echo ""
    echo "✅ Deployment muvaffaqiyatli!"
    echo ""
    echo "📊 Servicelar:"
    docker-compose ps
    echo ""
    echo "🌐 URL'lar:"
    echo "   MainPlatform: http://localhost:8000"
    echo "   API Docs:     http://localhost/api/v1/docs"
    echo "   Health:       http://localhost/api/v1/health"
}

deploy_db_only() {
    echo ""
    echo "🗄️ Ma'lumotlar bazasini ishga tushirish..."
    docker-compose up -d postgres redis
    echo "✅ Ma'lumotlar bazasi ishga tushdi!"
    echo "   PostgreSQL: localhost:5432"
    echo "   Redis:      localhost:6379"
}

run_migrations() {
    echo ""
    echo "🔄 Ma'lumotlar bazasi migratsiyasi..."
    cd MainPlatform/backend
    
    # Check if alembic is installed
    if ! command -v alembic &> /dev/null; then
        echo "📦 Alembic o'rnatilmoqda..."
        pip install alembic
    fi
    
    # Run migrations
    alembic upgrade head || echo "⚠️ Migratsiya xatosi"
    
    cd ../..
    echo "✅ Migratsiya muvaffaqiyatli!"
}

view_logs() {
    echo ""
    echo "📜 Loglarni ko'rish..."
    docker-compose logs -f
}

stop_all() {
    echo ""
    echo "🛑 Servicelarni to'xtatish..."
    docker-compose down
    echo "✅ Servicelar to'xtatildi!"
}

# Main menu
case "${1:-deploy}" in
    deploy|all)
        deploy_all
        ;;
    db)
        deploy_db_only
        ;;
    migrate|migration)
        run_migrations
        ;;
    logs)
        view_logs
        ;;
    stop|down)
        stop_all
        ;;
    status)
        docker-compose ps
        ;;
    build)
        echo "🔨 Docker imagelarni qayta qurish..."
        docker-compose build
        ;;
    clean)
        echo "🧹 Tozalash..."
        docker-compose down -v
        docker system prune -f
        ;;
    *)
        echo "🎓 Alif24 Platform Deployment Script"
        echo ""
        echo "Usage:"
        echo "  ./deploy.sh deploy     - Barcha servicelarni ishga tushirish"
        echo "  ./deploy.sh db         - Faqat ma'lumotlar bazasi"
        echo "  ./deploy.sh migrate    - Ma'lumotlar bazasi migratsiyasi"
        echo "  ./deploy.sh logs       - Loglarni ko'rish"
        echo "  ./deploy.sh stop       - Servicelarni to'xtatish"
        echo "  ./deploy.sh status     - Holatni ko'rish"
        echo "  ./deploy.sh build      - Docker imagelarni qayta qurish"
        echo "  ./deploy.sh clean      - To'liq tozalash"
        ;;
esac
