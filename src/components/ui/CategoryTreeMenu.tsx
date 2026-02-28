'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { toAppUrl } from '@/lib/urls';
import styles from './CategoryTreeMenu.module.css';

// Using a recursive type for nested categories
export type TreeCategory = {
    id: string;
    nameRu: string;
    slug?: string | null;
    children?: TreeCategory[];
};

interface CategoryTreeMenuProps {
    categories: TreeCategory[];
    activeCategoryId?: string;
}

const CategoryNode = ({ category, level, activeCategoryId }: { category: TreeCategory, level: number, activeCategoryId?: string }) => {
    // Check if this category or any of its children are active
    const isActive = category.id === activeCategoryId || category.slug === activeCategoryId;

    const hasChildren = category.children && category.children.length > 0;

    // Auto-expand if active or on root level
    const [isExpanded, setIsExpanded] = useState(level === 0 || isActive);

    const toggleExpand = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const linkHref = toAppUrl(`/search?category=${category.slug || category.id}`);

    return (
        <div className={styles.node} style={{ marginLeft: `${level * 12}px` }}>
            <div className={`${styles.nodeHeader} ${isActive ? styles.activeBg : ''}`}>
                {hasChildren ? (
                    <button
                        onClick={toggleExpand}
                        className={styles.toggleBtn}
                        aria-expanded={isExpanded}
                    >
                        <svg
                            className={`${styles.chevron} ${isExpanded ? styles.expanded : ''}`}
                            viewBox="0 0 24 24"
                            width="16"
                            height="16"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                ) : (
                    <span className={styles.emptySpacer}></span> // Spacer to align text with parent nodes
                )}
                <Link
                    href={linkHref}
                    className={`${styles.nodeLink} ${isActive ? styles.activeLink : ''} ${level === 0 ? styles.rootNodeText : ''}`}
                >
                    {category.nameRu}
                </Link>
            </div>

            {hasChildren && isExpanded && (
                <div className={styles.childrenWrapper}>
                    {category.children!.map(child => (
                        <CategoryNode
                            key={child.id}
                            category={child}
                            level={level + 1}
                            activeCategoryId={activeCategoryId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default function CategoryTreeMenu({ categories, activeCategoryId }: CategoryTreeMenuProps) {
    if (!categories || categories.length === 0) return null;

    return (
        <nav className={styles.treeMenu}>
            <div className={styles.menuHeader}>
                <h3 className={styles.menuTitle}>Каталог ✨</h3>
            </div>
            <div className={styles.nodesContainer}>
                {categories.map(cat => (
                    <CategoryNode
                        key={cat.id}
                        category={cat}
                        level={0}
                        activeCategoryId={activeCategoryId}
                    />
                ))}
            </div>
        </nav>
    );
}
