import './Card.css';

/**
 * Card Component
 * Reusable card container with various styles
 */
const Card = ({
  children,
  title,
  subtitle,
  icon,
  image,
  onClick,
  variant = 'default',
  className = '',
  hoverable = false
}) => {
  const classes = [
    'card',
    `card-${variant}`,
    hoverable ? 'card-hoverable' : '',
    onClick ? 'card-clickable' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick}>
      {image && (
        <div className="card-image">
          <img src={image} alt={title || ''} />
        </div>
      )}
      <div className="card-content">
        {(icon || title) && (
          <div className="card-header">
            {icon && <span className="card-icon">{icon}</span>}
            {title && <h3 className="card-title">{title}</h3>}
          </div>
        )}
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
        <div className="card-body">{children}</div>
      </div>
    </div>
  );
};

export default Card;
